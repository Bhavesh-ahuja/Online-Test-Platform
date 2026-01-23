import prisma from '../lib/prisma.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createExamSessionToken } from '../lib/examSessionToken.js';
import AppError from '../utils/AppError.js';

class TestService {
    async createTest(data, userId) {
        const {
            title,
            description,
            duration,
            scheduledStart,
            scheduledEnd,
            questions,
            attemptType,
            maxAttempts,
            type, // 'STANDARD' or 'SWITCH'
            switchConfig // { durationSeconds, maxLevel }
        } = data;

        if (scheduledStart && scheduledEnd && new Date(scheduledStart) >= new Date(scheduledEnd)) {
            throw new AppError('Scheduled End time must be after Start time', 400);
        }
        if (scheduledStart && new Date(scheduledStart) < new Date(new Date().getTime() - 60000)) { // Allow 1 min buffer
            throw new AppError('Scheduled Start time cannot be in the past', 400);
        }

        // Default duration for standard tests if not provided
        let finalDuration = duration || 30;

        // If Switch Challenge, use the config duration
        if (type === 'SWITCH' && switchConfig?.durationSeconds) {
            finalDuration = Math.ceil(switchConfig.durationSeconds / 60);
        }

        const newTest = await prisma.test.create({
            data: {
                title,
                description,
                duration: finalDuration,
                scheduledStart: scheduledStart ? new Date(scheduledStart) : null,
                scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : null,
                createdById: userId,
                attemptType: attemptType || 'ONCE',
                maxAttempts: maxAttempts ? parseInt(maxAttempts) : null,
                type: type || 'STANDARD',

                // Conditional Relations
                questions: type === 'STANDARD' && questions && questions.length > 0 ? {
                    create: questions.map((q) => ({
                        text: q.text,
                        type: q.type,
                        options: q.options, // Already JSON array
                        correctAnswer: q.correctAnswer,
                    })),
                } : undefined,

                switchConfig: type === 'SWITCH' ? {
                    create: {
                        durationSeconds: switchConfig.durationSeconds || 360,
                        maxLevel: switchConfig.maxLevel || 5
                    }
                } : undefined
            },
            include: {
                questions: true,
                switchConfig: true
            },
        });

        return newTest;
    }

    async updateTest(id, data, userRole, userId) {
        // 1. Check if test exists
        const existingTest = await prisma.test.findUnique({
            where: { id: parseInt(id) },
            include: { _count: { select: { submissions: true } } }
        });

        if (!existingTest) throw new AppError('Test not found', 404);

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
        if (data.scheduledStart && data.scheduledEnd && new Date(data.scheduledStart) >= new Date(data.scheduledEnd)) {
            throw new AppError('Scheduled End time must be after Start time', 400);
        }
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
        return await prisma.$transaction(async (tx) => {
            const test = await tx.test.findUnique({ where: { id: parseInt(testId) } });
            if (!test) throw new AppError('Test not found', 404);

            const now = new Date();
            if (test.scheduledStart && now < new Date(test.scheduledStart)) {
                throw new AppError(`Test has not started yet. Starts at: ${new Date(test.scheduledStart).toLocaleString()}`, 403);
            }
            if (test.scheduledEnd && now > new Date(test.scheduledEnd)) {
                throw new AppError('Test window has closed.', 403);
            }

            // Lock the submissions check
            const submissions = await tx.testSubmission.findMany({
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
                throw new AppError('Maximum attempts reached', 403);
            }

            const submission = await tx.testSubmission.create({
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
        });
    }

    async getAllTests() {
        return await prisma.test.findMany({
            include: {
                createdBy: { select: { email: true } },
                _count: { select: { questions: true } }
            }
        });
    }

    async getTestById(id, includeAnswers = false) {
        const test = await prisma.test.findUnique({
            where: { id: parseInt(id) },
            include: {
                questions: {
                    select: {
                        id: true,
                        text: true,
                        type: true,
                        options: true,
                        correctAnswer: includeAnswers, // Only include if admin
                    },
                },
                switchConfig: true, // Include logic config
            },
        });

        if (!test) {
            throw new Error('Test not found');
        }
        return test;
    }

    async submitTest(params, body, examSession) {
        if (!examSession) throw new AppError('Invalid or expired exam session', 401);

        const { id } = params;
        const { answers, status, metrics, finalScore, testType } = body; // metrics/finalScore from Switch
        const { submissionId } = examSession;

        const submission = await prisma.testSubmission.findUnique({
            where: { id: submissionId },
            include: { test: { select: { type: true } } }
        });

        if (!submission) throw new AppError('Submission not found', 404);
        if (submission.status !== 'IN_PROGRESS') throw new AppError('Submission already finalized', 400);
        if (examSession.status !== 'IN_PROGRESS') throw new AppError('Submission already closed', 400);

        // --- HANDLE SWITCH CHALLENGE ---
        if (submission.test.type === 'SWITCH' || testType === 'SWITCH') {
            // 1. Validate Metrics (Basic)
            if (!metrics) throw new AppError('Missing performance metrics', 400);

            const score = finalScore || 0;
            const accuracy = metrics.correct / (metrics.totalAttempts || 1);

            await prisma.$transaction([
                // Create specialized result record
                prisma.switchChallengeResult.create({
                    data: {
                        userId: submission.studentId,
                        testId: parseInt(id),
                        score: score,
                        accuracy: accuracy,
                        metrics: metrics,
                        submissionId: submission.id // REQUIRED by schema
                    }
                }),
                // Update main submission record for integrity
                prisma.testSubmission.update({
                    where: { id: submission.id },
                    data: {
                        score: score,
                        status: metrics.reason === 'TIMEOUT' ? 'TIMEOUT' : (metrics.reason === 'VIOLATION_LIMIT' ? 'TERMINATED' : 'COMPLETED'),
                    }
                })
            ]);
            return { success: true, submissionId: submission.id };
        }

        // --- HANDLE STANDARD TEST ---
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
                    status: ['TIMEOUT', 'TERMINATED'].includes(status) ? status : 'COMPLETED',
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
            throw new AppError('Submission not found or unauthorized', 404);
        }
        return submission;
    }

    async getMySubmissions(studentId) {
        // 1. Get Standard Submissions
        const standardMatches = await prisma.testSubmission.findMany({
            where: { studentId },
            include: {
                test: {
                    select: {
                        title: true,
                        type: true,
                        _count: { select: { questions: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // 2. Get Switch Submissions
        const switchMatches = await prisma.switchChallengeResult.findMany({
            where: { userId: studentId },
            include: {
                test: {
                    select: { title: true, type: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // 3. Merge and Sort
        const all = [...standardMatches, ...switchMatches].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        return all;
    }

    async getTestSubmissions(testId, page = 1, limit = 10) {
        const skip = (page - 1) * limit;

        const [total, submissions] = await prisma.$transaction([
            prisma.testSubmission.count({ where: { testId: parseInt(testId) } }),
            prisma.testSubmission.findMany({
                where: { testId: parseInt(testId) },
                include: {
                    student: { select: { email: true, id: true } },
                },
                orderBy: { score: 'desc' },
                skip,
                take: limit
            })
        ]);

        return {
            submissions,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page
        };
    }

    async deleteTest(id) {
        const test = await prisma.test.findUnique({
            where: { id: parseInt(id) },
            include: { _count: { select: { submissions: true } } }
        });

        if (!test) throw new AppError("Test not found", 404);
        if (test._count.submissions > 0) {
            throw new AppError('Cannot delete test because it has student submissions. Archiving is recommended instead.', 400);
        }

        await prisma.$transaction([
            prisma.answer.deleteMany({ where: { question: { testId: parseInt(id) } } }),
            prisma.question.deleteMany({ where: { testId: parseInt(id) } }),
            prisma.test.delete({ where: { id: parseInt(id) } })
        ]);

        return { message: 'Test deleted successfully' };
    }

    async uploadTestPDF(file) {
        if (!file) throw new AppError("No PDF file uploaded", 400);

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
            throw new AppError("Could not extract enough text. Ensure this is a text-based PDF.", 400);
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL_ID || "models/gemini-2.5-flash" });

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
            throw new AppError("AI failed to format the questions correctly. Please try a cleaner PDF.", 500);
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
