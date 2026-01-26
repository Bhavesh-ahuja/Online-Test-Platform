import prisma from '../lib/prisma.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createExamSessionToken } from '../lib/examSessionToken.js';
import AppError from '../utils/AppError.js';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
        if (scheduledStart && new Date(scheduledStart) < new Date(new Date().getTime() - 3600000)) { // Allow 1 hour buffer for testing
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
                duration: parseInt(duration),
                showResult: data.showResult ?? true,
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
            showResult: data.showResult,
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
            if (test.attemptType === 'ONCE' && completedCount >= 1) {
                throw new AppError('You have already taken this test', 403);
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

    async getAllTests(userId) {
        // 1. Fetch all tests
        const tests = await prisma.test.findMany({
            include: {
                createdBy: { select: { email: true } },
                _count: { select: { questions: true } }
            }
        });

        // 2. If no user, return raw tests (or empty array if strict)
        if (!userId) return tests;

        // 3. Fetch all submissions for this user (both standard and switch)
        const submissions = await prisma.testSubmission.findMany({
            where: { studentId: userId },
            orderBy: { createdAt: 'desc' }
        });

        const switchResults = await prisma.switchChallengeResult.findMany({
            where: { userId: userId },
            orderBy: { createdAt: 'desc' }
        });

        // OPTIMIZATION: Index submissions by testId to avoid O(N*M) filtering
        const submissionsMap = {}; // { testId: [submissions] }
        submissions.forEach(s => {
            if (!submissionsMap[s.testId]) submissionsMap[s.testId] = [];
            submissionsMap[s.testId].push(s);
        });

        const switchResultsMap = {}; // { testId: [results] }
        switchResults.forEach(r => {
            if (!switchResultsMap[r.testId]) switchResultsMap[r.testId] = [];
            switchResultsMap[r.testId].push(r);
        });

        // 4. Map status to tests
        return tests.map(test => {
            let userStatus = null;
            let attemptCount = 0;

            // Fast Lookup
            const mySubmissions = submissionsMap[test.id] || [];
            const mySwitchResults = switchResultsMap[test.id] || [];

            attemptCount = mySubmissions.length;

            if (test.type === 'SWITCH') {
                // Check for active session
                const inProgress = mySubmissions.find(s => s.status === 'IN_PROGRESS');
                const lastResult = mySwitchResults[0]; // Already sorted desc

                if (inProgress) {
                    userStatus = { status: 'IN_PROGRESS', submissionId: inProgress.id };
                } else if (lastResult) {
                    // Find the completed submission corresponding to this result if possible
                    // or just return completed status
                    const completed = mySubmissions.find(s => ['COMPLETED', 'TIMEOUT', 'TERMINATED'].includes(s.status));
                    if (completed) {
                        userStatus = {
                            status: completed.status,
                            submissionId: completed.id,
                            score: completed.score
                        };
                    }
                }
            } else {
                // Standard Test
                const inProgress = mySubmissions.find(s => s.status === 'IN_PROGRESS');
                const completed = mySubmissions.find(s => ['COMPLETED', 'TIMEOUT', 'TERMINATED'].includes(s.status));

                if (inProgress) {
                    userStatus = { status: 'IN_PROGRESS', submissionId: inProgress.id };
                } else if (completed) {
                    userStatus = {
                        status: completed.status,
                        submissionId: completed.id,
                        score: completed.score
                    };
                }
            }

            return {
                ...test,
                userStatus,
                attemptCount
            };
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

        return await prisma.$transaction(async (tx) => {
            const submission = await tx.testSubmission.findUnique({
                where: { id: submissionId },
                include: { test: { select: { type: true, showResult: true } } }
            });

            if (!submission) throw new AppError('Submission not found', 404);
            if (submission.status !== 'IN_PROGRESS') throw new AppError('Submission already finalized', 400);
            if (examSession.status !== 'IN_PROGRESS') throw new AppError('Submission already closed', 400);

            let score = 0;
            let newStatus = 'COMPLETED';

            // --- HANDLE SWITCH CHALLENGE ---
            if (submission.test.type === 'SWITCH' || testType === 'SWITCH') {
                if (!metrics) throw new AppError('Missing performance metrics', 400);

                score = finalScore || 0;
                newStatus = metrics.reason === 'TIMEOUT' ? 'TIMEOUT' : (metrics.reason === 'VIOLATION_LIMIT' ? 'TERMINATED' : 'COMPLETED');
                const accuracy = metrics.correct / (metrics.totalAttempts || 1);

                await tx.switchChallengeResult.create({
                    data: {
                        userId: submission.studentId,
                        testId: parseInt(id),
                        score: score,
                        accuracy: accuracy,
                        metrics: metrics,
                        submissionId: submission.id
                    }
                });
            } else {
                // --- HANDLE STANDARD TEST ---
                const correctQuestions = await tx.question.findMany({
                    where: { testId: parseInt(id) },
                    select: { id: true, correctAnswer: true },
                });

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

                newStatus = ['TIMEOUT', 'TERMINATED'].includes(status) ? status : 'COMPLETED';

                await tx.answer.deleteMany({ where: { submissionId: submission.id } });
                await tx.answer.createMany({ data: answerRecords });
            }

            // --- ATOMIC FINALIZATION ---
            // Only update if status is STILL 'IN_PROGRESS'
            const result = await tx.testSubmission.updateMany({
                where: {
                    id: submission.id,
                    status: 'IN_PROGRESS'
                },
                data: {
                    score,
                    status: newStatus,
                    canViewResult: submission.test.showResult,
                }
            });

            if (result.count === 0) {
                throw new AppError('Submission race condition detected - already finalized', 409);
            }

            return { success: true, submissionId: submission.id, showResult: submission.test.showResult };
        });
    }

    async getTestResult(submissionId, userId, role) {


        const submission = await prisma.testSubmission.findUnique({
            where: { id: parseInt(submissionId) },
            include: {
                test: { select: { title: true, showResult: true, _count: { select: { questions: true } } } },
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
        if (!submission.canViewResult) {
            throw new AppError('Results for this test are not available yet.', 403);


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

    async getTestSubmissions(testId, page = 1, limit = 10, sortBy = 'score', order = 'desc') {
        const skip = (page - 1) * limit;

        // Map frontend sort keys to Prisma fields
        let orderBy = {};
        if (sortBy === 'email') {
            orderBy = { student: { email: order } };
        } else if (sortBy === 'date') {
            orderBy = { createdAt: order };
        } else {
            orderBy = { score: order }; // Default
        }

        const [total, submissions] = await prisma.$transaction([
            prisma.testSubmission.count({ where: { testId: parseInt(testId) } }),
            prisma.testSubmission.findMany({
                where: { testId: parseInt(testId) },
                include: {
                    student: {
                        select: {
                            firstName: true,
                            lastName: true,
                            prn: true,
                            email: true,
                            year: true, id: true
                        }
                    },
                },
                orderBy: orderBy,
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

    async exportTestResultsPDF(testId) {
        // 1. Fetch Data (All Submissions, No Pagination)
        const test = await prisma.test.findUnique({ where: { id: parseInt(testId) } });
        if (!test) throw new AppError('Test not found', 404);

        const submissions = await prisma.testSubmission.findMany({
            where: { testId: parseInt(testId) },
            include: {
                student: { select: { email: true, firstName: true, lastName: true } }
            },
            orderBy: { score: 'desc' }
        });

        // 2. Setup PDF Doc
        const doc = new PDFDocument({ margin: 50, size: 'A4' });

        // 3. Watermark (Team Logo)
        // Path relative to backend/services -> frontend/public/img/logo.png
        // backend/services/../../frontend/public/img/logo.png
        const logoPath = path.join(__dirname, '../../frontend/public/img/logo.png');

        if (fs.existsSync(logoPath)) {
            // Add Logo as Watermark (Centered, Faded)
            const pageWidth = doc.page.width;
            const pageHeight = doc.page.height;
            doc.image(logoPath, pageWidth / 2 - 100, pageHeight / 2 - 100, {
                width: 200,
                opacity: 0.1
            });
        }

        // 4. Header
        doc.fontSize(20).text('Class Result Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(14).text(`Test: ${test.title}`, { align: 'center' });
        doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center', color: 'gray' });
        doc.moveDown(2);

        // 5. Table Header
        const startY = doc.y;
        const colX = [50, 200, 350, 450]; // X positions for columns

        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Student Name', colX[0], startY);
        doc.text('Email', colX[1], startY);
        doc.text('Status', colX[2], startY);
        doc.text('Score', colX[3], startY);

        doc.moveTo(50, startY + 15).lineTo(550, startY + 15).stroke();
        doc.moveDown();

        // 6. Table Rows
        doc.font('Helvetica');
        let currentY = doc.y + 10;

        submissions.forEach((sub, index) => {
            // Page Break Check
            if (currentY > 750) {
                doc.addPage();
                // Re-add Watermark on new page
                if (fs.existsSync(logoPath)) {
                    doc.image(logoPath, doc.page.width / 2 - 100, doc.page.height / 2 - 100, { width: 200, opacity: 0.1 });
                }
                currentY = 50;
            }

            const fullName = `${sub.student.firstName || ''} ${sub.student.lastName || ''}`.trim() || 'N/A';

            doc.text(fullName, colX[0], currentY, { width: 140, ellipsis: true });
            doc.text(sub.student.email, colX[1], currentY, { width: 140, ellipsis: true });

            // Status Color Logic (Simple text for PDF)
            doc.fillColor(sub.status === 'TERMINATED' ? 'red' : 'black');
            doc.text(sub.status, colX[2], currentY);
            doc.fillColor('black');

            doc.text(sub.score.toString(), colX[3], currentY);

            currentY += 20;
        });

        // 7. Footer
        const totalStudents = submissions.length;
        const avgScore = totalStudents > 0 ? (submissions.reduce((acc, curr) => acc + curr.score, 0) / totalStudents).toFixed(1) : 0;

        doc.moveDown(2);
        doc.font('Helvetica-Bold').text(`Total Students: ${totalStudents}   |   Average Score: ${avgScore}`, { align: 'right' });

        doc.end();
        return doc;
    }

    async autosaveTestProgress(examSession, data) {
        const { submissionId } = examSession;
        const { answers, markedQuestions } = data;

        await prisma.testSubmission.update({
            where: { id: submission.id },
            data: {
                score,
                status: finalStatus,
                canViewResult: canSeeResult // ✅ THIS LINE
            }
        });

    }
}

export default new TestService();
