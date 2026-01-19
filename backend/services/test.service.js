import prisma from '../lib/prisma.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createExamSessionToken } from '../lib/examSessionToken.js';

class TestService {
    async createTest(data, userId) {
        const { title, description, duration, questions, scheduledStart, scheduledEnd } = data;

        return await prisma.test.create({
            data: {
                title,
                description,
                duration: parseInt(duration),
                scheduledStart: scheduledStart ? new Date(scheduledStart) : null,
                scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : null,
                createdById: userId,
                questions: {
                    create: questions.map(q => ({
                        text: q.text,
                        type: q.type,
                        options: q.options || [],
                        correctAnswer: q.correctAnswer
                    }))
                }
            },
            include: {
                questions: true
            }
        });
    }

    async updateTest(id, data, userRole, userId) {
        // 1. Check if test exists
        const existingTest = await prisma.test.findUnique({
            where: { id: parseInt(id) },
            include: { _count: { select: { submissions: true } } }
        });

        if (!existingTest) throw new Error('Test not found');

        // 2. Check for Submissions (Safety Lock)
        const hasSubmissions = existingTest._count.submissions > 0;

        // 3. Prepare Update Data
        const updateData = {
            title: data.title,
            description: data.description,
            duration: parseInt(data.duration),
            scheduledStart: data.scheduledStart ? new Date(data.scheduledStart) : null,
            scheduledEnd: data.scheduledEnd ? new Date(data.scheduledEnd) : null,
            attemptType: data.attemptType,
            maxAttempts: data.attemptType === 'LIMITED' ? data.maxAttempts : null,
        };


        // 4. Handle Questions Logic
        if (data.questions && data.questions.length > 0) {
            if (!hasSubmissions) {
                updateData.questions = {
                    deleteMany: {},
                    create: data.questions.map(q => ({
                        text: q.text,
                        type: q.type,
                        options: q.options || [],
                        correctAnswer: q.correctAnswer
                    }))
                };
            }
        }

        // 5. Perform Update
        return await prisma.test.update({
            where: { id: parseInt(id) },
            data: updateData,
            include: { questions: true }
        });
    }

    async startTest(testId, studentId) {
        const test = await prisma.test.findUnique({ where: { id: parseInt(testId) } });
        if (!test) throw new Error('Test not found');

        const now = new Date();
        if (test.scheduledStart && now < new Date(test.scheduledStart)) {
            throw new Error(`Test has not started yet. Starts at: ${new Date(test.scheduledStart).toLocaleString()}`);
        }
        if (test.scheduledEnd && now > new Date(test.scheduledEnd)) {
            throw new Error('Test window has closed.');
        }

        const submissions = await prisma.testSubmission.findMany({
            where: { testId: parseInt(testId), studentId },
            orderBy: { createdAt: 'desc' }
        });

        const inProgress = submissions.find(s => s.status === 'IN_PROGRESS');
        const completedCount = submissions.filter(s => ['COMPLETED', 'TIMEOUT', 'TERMINATED'].includes(s.status)).length;

        if (inProgress) {
            const examSessionToken = createExamSessionToken({
                submissionId: inProgress.id,
                testId: test.id,
                studentId: inProgress.studentId,
                expiresInSeconds: test.duration * 60 + 15 * 60
            });
            return {
                message: 'Resuming test',
                startTime: inProgress.createdAt,
                submissionId: inProgress.id,
                examSessionToken,
                draft: inProgress.answersDraft ?? null
            };
        }

        if (test.attemptType === 'LIMITED' && test.maxAttempts !== null && completedCount >= test.maxAttempts) {
            throw new Error('Maximum attempts reached');
        }

        const submission = await prisma.testSubmission.create({
            data: {
                testId: parseInt(testId),
                studentId,
                status: 'IN_PROGRESS',
                score: 0
            }
        });

        const durationInSeconds = test.duration * 60;
        const bufferInSeconds = 15 * 60;
        const examSessionToken = createExamSessionToken({
            submissionId: submission.id,
            testId: test.id,
            studentId: submission.studentId,
            expiresInSeconds: durationInSeconds + bufferInSeconds
        });

        return {
            message: 'Test started',
            startTime: submission.createdAt,
            submissionId: submission.id,
            examSessionToken
        };
    }

    async getAllTests() {
        return await prisma.test.findMany({
            include: {
                createdBy: { select: { email: true } },
                _count: { select: { questions: true } }
            }
        });
    }

    async getTestById(id, withAnswers = false) {
        const includeOptions = withAnswers
            ? { questions: true }
            : {
                questions: {
                    select: {
                        id: true,
                        text: true,
                        type: true,
                        options: true
                    }
                }
            };

        const test = await prisma.test.findUnique({
            where: { id: parseInt(id) },
            include: includeOptions
        });

        if (!test) throw new Error('Test not found');
        return test;
    }

    async submitTest(params, body, examSession) {
        if (!examSession) throw new Error('Invalid or expired exam session');

        const { id } = params;
        const { answers, status } = body;
        const { submissionId } = examSession;

        const submission = await prisma.testSubmission.findUnique({ where: { id: submissionId } });
        if (!submission) throw new Error('Submission not found');
        if (submission.status !== 'IN_PROGRESS') throw new Error('Submission already finalized');
        if (examSession.status !== 'IN_PROGRESS') throw new Error('Submission already closed');

        const correctQuestions = await prisma.question.findMany({
            where: { testId: parseInt(id) },
            select: { id: true, correctAnswer: true },
        });

        let score = 0;
        const answerRecords = [];

        for (const q of correctQuestions) {
            const studentAnswer = answers?.[q.id];
            const isCorrect = studentAnswer === q.correctAnswer;
            if (isCorrect) score++;

            answerRecords.push({
                selectedAnswer: studentAnswer || "No Answer",
                isCorrect: isCorrect,
                questionId: q.id,
                submissionId: submission.id,
            });
        }

        await prisma.$transaction([
            prisma.answer.deleteMany({ where: { submissionId: submission.id } }),
            prisma.answer.createMany({ data: answerRecords }),
            prisma.testSubmission.update({
                where: { id: submission.id },
                data: {
                    score,
                    status: status === 'TIMEOUT' ? 'TIMEOUT' : 'COMPLETED',
                },
            }),
        ]);

        return { success: true, submissionId: submission.id };

    }

    async getTestResult(submissionId, userId, role) {
        const submission = await prisma.testSubmission.findUnique({
            where: { id: parseInt(submissionId) },
            include: {
                test: { select: { title: true, _count: { select: { questions: true } } } },
                answers: {
                    include: {
                        question: { select: { text: true, options: true, correctAnswer: true } }
                    }
                }
            }
        });

        if (!submission || (submission.studentId !== userId && role !== 'ADMIN')) {
            throw new Error('Submission not found or unauthorized');
        }
        return submission;
    }

    async getMySubmissions(studentId) {
        return await prisma.testSubmission.findMany({
            where: { studentId: studentId },
            include: {
                test: { select: { title: true, _count: { select: { questions: true } } } }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async getTestSubmissions(testId) {
        return await prisma.testSubmission.findMany({
            where: { testId: parseInt(testId) },
            include: {
                student: { select: { email: true, id: true } },
            },
            orderBy: { score: 'desc' }
        });
    }

    async deleteTest(id) {
        const test = await prisma.test.findUnique({
            where: { id: parseInt(id) },
            include: { _count: { select: { submissions: true } } }
        });

        if (!test) throw new Error("Test not found");
        if (test._count.submissions > 0) {
            throw new Error('Cannot delete test because it has student submissions. Archiving is recommended instead.');
        }

        await prisma.$transaction([
            prisma.answer.deleteMany({ where: { question: { testId: parseInt(id) } } }),
            prisma.question.deleteMany({ where: { testId: parseInt(id) } }),
            prisma.test.delete({ where: { id: parseInt(id) } })
        ]);

        return { message: 'Test deleted successfully' };
    }

    async uploadTestPDF(file) {
        if (!file) throw new Error("No PDF file uploaded");

        const data = new Uint8Array(file.buffer);
        const loadingTask = getDocument(data);
        const pdfDocument = await loadingTask.promise;

        let extractedText = "";
        for (let i = 1; i <= pdfDocument.numPages; i++) {
            const page = await pdfDocument.getPage(i);
            const content = await page.getTextContent();
            extractedText += content.items.map(item => item.str).join(" ") + "\n";
        }

        if (!extractedText || extractedText.length < 50) {
            throw new Error("Could not extract enough text. Ensure this is a text-based PDF.");
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "models/gemini-2.5-flash" });

        const prompt = `
      You are an exam parser helper.
      Read the following text extracted from a PDF.Identify all Multiple Choice Questions (MCQs).
      
      Your Goal: Convert the text into a strict JSON array.
      
      Rules:
      1. Extract the "text" (questions).
      2. Extract the "options" (array of strings).
      3. If you can detect the correct answer (marked by *,bold,or an answer key), put it in "correctAnswer".
         If you cannot find the answer, leave "correct Answer" as an empty string "".
      4. Default "type" to "MCQ".
      5. Output ONLY valid JSON. No markdown.
      
      JSON Structure:
      [
        {
          "text": "Question goes here?",
          "type": "MCQ",
          "options" : ["Option A","Option B","Option C","Option D",so on.......],
          "correctAnswer": "Correct answer goes here"
        }
      ]
        
      Here is the PDF text:
      ${extractedText}
      `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();

        try {
            const questions = JSON.parse(cleanJson);
            return { questions };
        } catch (parseError) {
            throw new Error("AI failed to format the questions correctly. Please try a cleaner PDF.");
        }
    }

    async autosaveTestProgress(examSession, data) {
        const { submissionId } = examSession;
        const { answers, markedQuestions } = data;

        await prisma.testSubmission.update({
            where: { id: submissionId },
            data: {
                answersDraft: {
                    answers,
                    markedQuestions,
                    updatedAt: new Date()
                }
            }
        });
    }
}

export default new TestService();
