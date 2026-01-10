import prisma from '../lib/prisma.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

/* =========================
   CREATE TEST
========================= */
export const createTest = async (req, res) => {
  const {
    title,
    description,
    duration,
    questions,
    scheduledStart,
    scheduledEnd,
    attemptType,
    maxAttempts
  } = req.body;

  const userId = req.user.userId;

  try {
    const newTest = await prisma.test.create({
      data: {
        title,
        description,
        duration: parseInt(duration),
        scheduledStart: scheduledStart ? new Date(scheduledStart) : null,
        scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : null,
        attemptType: attemptType || 'ONCE',
        maxAttempts: attemptType === 'LIMITED' ? parseInt(maxAttempts) : null,
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
      include: { questions: true }
    });

    res.status(201).json(newTest);
  } catch (error) {
    console.error('Create test error:', error);
    res.status(500).json({ error: 'Failed to create test' });
  }
};

/* =========================
   UPDATE TEST
========================= */
export const updateTest = async (req, res) => {
  const { id } = req.params;
  const {
    title,
    description,
    duration,
    questions,
    scheduledStart,
    scheduledEnd,
    attemptType,
    maxAttempts
  } = req.body;

  try {
    const existingTest = await prisma.test.findUnique({
      where: { id: parseInt(id) },
      include: { _count: { select: { submissions: true } } }
    });

    if (!existingTest) return res.status(404).json({ error: 'Test not found' });

    const hasSubmissions = existingTest._count.submissions > 0;

    const updateData = {
      title,
      description,
      duration: parseInt(duration),
      scheduledStart: scheduledStart ? new Date(scheduledStart) : null,
      scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : null,
      attemptType,
      maxAttempts: attemptType === 'LIMITED' ? parseInt(maxAttempts) : null
    };

    if (questions && questions.length > 0 && !hasSubmissions) {
      updateData.questions = {
        deleteMany: {},
        create: questions.map(q => ({
          text: q.text,
          type: q.type,
          options: q.options || [],
          correctAnswer: q.correctAnswer
        }))
      };
    }

    const updatedTest = await prisma.test.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: { questions: true }
    });

    res.json(updatedTest);
  } catch (error) {
    console.error('Update test error:', error);
    res.status(500).json({ error: 'Failed to update test' });
  }
};

/* =========================
   START TEST (ATTEMPTS)
========================= */
export const startTest = async (req, res) => {
  const { id } = req.params;
  const studentId = req.user.userId;

  try {
    const test = await prisma.test.findUnique({
      where: { id: parseInt(id) }
    });

    if (!test) return res.status(404).json({ error: 'Test not found' });

    const now = new Date();

    if (test.scheduledStart && now < new Date(test.scheduledStart)) {
      return res.status(403).json({ error: 'Test has not started yet.' });
    }

    if (test.scheduledEnd && now > new Date(test.scheduledEnd)) {
      return res.status(403).json({ error: 'Test window has closed.' });
    }

    const completedAttempts = await prisma.testSubmission.count({
      where: {
        testId: parseInt(id),
        studentId,
        status: { not: 'IN_PROGRESS' }
      }
    });

    if (test.attemptType === 'ONCE' && completedAttempts >= 1) {
      return res.status(403).json({ error: 'You have already attempted this test.' });
    }

    if (
      test.attemptType === 'LIMITED' &&
      test.maxAttempts !== null &&
      completedAttempts >= test.maxAttempts
    ) {
      return res.status(403).json({
        error: `Attempt limit reached (${test.maxAttempts})`
      });
    }

    let submission = await prisma.testSubmission.findFirst({
      where: {
        testId: parseInt(id),
        studentId,
        status: 'IN_PROGRESS'
      }
    });

    if (!submission) {
      submission = await prisma.testSubmission.create({
        data: {
          testId: parseInt(id),
          studentId,
          status: 'IN_PROGRESS',
          score: 0
        }
      });
    }

    res.json({
      message: 'Test started',
      startTime: submission.createdAt,
      submissionId: submission.id
    });
  } catch (error) {
    console.error('Start test error:', error);
    res.status(500).json({ error: 'Failed to start test' });
  }
};

/* =========================
   GET ALL TESTS
========================= */
export const getAllTests = async (req, res) => {
  try {
    const tests = await prisma.test.findMany({
      include: {
        createdBy: { select: { email: true } },
        _count: { select: { questions: true } }
      }
    });
    res.json(tests);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tests' });
  }
};

/* =========================
   GET TEST (STUDENT)
========================= */
export const getTestById = async (req, res) => {
  const { id } = req.params;

  try {
    const test = await prisma.test.findUnique({
      where: { id: parseInt(id) },
      include: {
        questions: {
          select: {
            id: true,
            text: true,
            type: true,
            options: true
          }
        }
      }
    });

    if (!test) return res.status(404).json({ error: 'Test not found' });
    res.json(test);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch test' });
  }
};

/* =========================
   GET TEST (ADMIN)
========================= */
export const getTestByIdForAdmin = async (req, res) => {
  const { id } = req.params;

  try {
    const test = await prisma.test.findUnique({
      where: { id: parseInt(id) },
      include: { questions: true }
    });

    if (!test) return res.status(404).json({ error: 'Test not found' });
    res.json(test);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch test (admin)' });
  }
};

/* =========================
   SUBMIT TEST
========================= */
export const submitTest = async (req, res) => {
  const { id } = req.params;
  const { answers, status } = req.body;
  const studentId = req.user.userId;

  try {
    const submission = await prisma.testSubmission.findFirst({
      where: {
        testId: parseInt(id),
        studentId,
        status: 'IN_PROGRESS'
      },
      include: { test: true }
    });

    if (!submission) {
      return res.status(404).json({ error: 'Active test session not found.' });
    }

    const correctQuestions = await prisma.question.findMany({
      where: { testId: parseInt(id) },
      select: { id: true, correctAnswer: true }
    });

    let score = 0;
    const answerRecords = [];

    for (const q of correctQuestions) {
      const studentAnswer = answers[q.id];
      const isCorrect = studentAnswer === q.correctAnswer;
      if (isCorrect) score++;

      answerRecords.push({
        selectedAnswer: studentAnswer || 'No Answer',
        isCorrect,
        questionId: q.id,
        submissionId: submission.id
      });
    }

    await prisma.$transaction([
      prisma.answer.createMany({ data: answerRecords }),
      prisma.testSubmission.update({
        where: { id: submission.id },
        data: { score, status: status || 'COMPLETED' }
      })
    ]);

    res.json({ message: 'Test submitted', submissionId: submission.id });
  } catch (error) {
    console.error('Submit error:', error);
    res.status(500).json({ error: 'Failed to submit test' });
  }
};

/* =========================
   RESULTS
========================= */
export const getTestResult = async (req, res) => {
  const { submissionId } = req.params;
  const studentId = req.user.userId;

  try {
    const submission = await prisma.testSubmission.findUnique({
      where: { id: parseInt(submissionId) },
      include: {
        test: { select: { title: true } },
        answers: { include: { question: true } }
      }
    });

    if (!submission || submission.studentId !== studentId) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    res.json(submission);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch result' });
  }
};

/* =========================
   MY SUBMISSIONS
========================= */
export const getMySubmissions = async (req, res) => {
  const studentId = req.user.userId;

  try {
    const submissions = await prisma.testSubmission.findMany({
      where: { studentId },
      include: {
        test: { select: { title: true, _count: { select: { questions: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(submissions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
};

/* =========================
   ADMIN – ALL SUBMISSIONS
========================= */
export const getTestSubmissions = async (req, res) => {
  const { id } = req.params;

  try {
    const submissions = await prisma.testSubmission.findMany({
      where: { testId: parseInt(id) },
      include: {
        student: { select: { email: true, id: true } }
      },
      orderBy: { score: 'desc' }
    });

    res.json(submissions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
};

/* =========================
   DELETE TEST
========================= */
export const deleteTest = async (req, res) => {
  const { id } = req.params;

  try {
    const test = await prisma.test.findUnique({
      where: { id: parseInt(id) },
      include: { _count: { select: { submissions: true } } }
    });

    if (!test) return res.status(404).json({ error: 'Test not found' });

    if (test._count.submissions > 0) {
      return res.status(400).json({
        error: 'Cannot delete test with existing submissions'
      });
    }

    await prisma.$transaction([
      prisma.answer.deleteMany({
        where: { question: { testId: parseInt(id) } }
      }),
      prisma.question.deleteMany({
        where: { testId: parseInt(id) }
      }),
      prisma.test.delete({ where: { id: parseInt(id) } })
    ]);

    res.json({ message: 'Test deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete test' });
  }
};

/* =========================
   UPLOAD TEST PDF
========================= */
export const uploadTestPDF = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No PDF file uploaded' });

    const data = new Uint8Array(req.file.buffer);
    const pdf = await getDocument(data).promise;

    let extractedText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      extractedText += content.items.map(item => item.str).join(' ') + '\n';
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'models/gemini-2.5-flash' });

    const result = await model.generateContent(extractedText);
    const text = result.response.text().replace(/```json|```/g, '').trim();

    const questions = JSON.parse(text);
    res.json({ questions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process PDF' });
  }
};
