import prisma from '../lib/prisma.js';
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
        // Fetch all submissions for this user (both standard and switch)
        // Since Switch Challenge results are linked to a TestSubmission, we only need to query one table.
        const submissions = await prisma.testSubmission.findMany({
            where: { studentId },
            include: {
                test: {
                    select: {
                        title: true,
                        type: true,
                        // For standard tests count questions
                        _count: { select: { questions: true } }
                    }
                },
                switchResult: {
                    select: {
                        score: true,
                        metrics: true,
                        createdAt: true // Include completion time
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return submissions;
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
                            email: true,
                            id: true
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



    async autosaveTestProgress(examSession, data) {
        const { submissionId } = examSession;
        const { answers, markedQuestions } = data;

        // Update the draft answers in the database
        // We do NOT update score or status here, as the test is still in progress
        await prisma.testSubmission.update({
            where: { id: parseInt(submissionId) },
            data: {
                answersDraft: {
                    answers,
                    markedQuestions
                }
            }
        });

        return { success: true };
    }
}

export default new TestService();
