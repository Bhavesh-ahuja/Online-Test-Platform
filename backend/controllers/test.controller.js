import prisma from '../lib/prisma.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createExamSessionToken } from '../lib/examSessionToken.js';


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

    // ===============================
// ATTEMPT & RESUME LOGIC (FIXED)
// ===============================

const submissions = await prisma.testSubmission.findMany({
  where: {
    testId: parseInt(id),
    studentId
  },
  orderBy: { createdAt: 'desc' }
});

const inProgress = submissions.find(s => s.status === 'IN_PROGRESS');
const completedCount = submissions.filter(s => s.status !== 'IN_PROGRESS').length;

// 1️⃣ Resume if already IN_PROGRESS
if (inProgress) {
  const examSessionToken = createExamSessionToken({
    submissionId: inProgress.id,
    testId: test.id,
    studentId: inProgress.studentId,
    expiresInSeconds: test.duration * 60 + 15 * 60
  });

  return res.json({
    message: 'Resuming test',
    startTime: inProgress.createdAt,
    submissionId: inProgress.id,
    examSessionToken,
    // ADD THIS LINE:
    draft: inProgress.answersDraft 
  });
}

// 2️⃣ Block if attempts exhausted
if (test.attemptType === 'ONCE' && completedCount >= 1) {
  return res.status(403).json({
    error: 'Test already completed',
    finalSubmissionId: submissions[0].id
  });
}

if (
  test.attemptType === 'LIMITED' &&
  test.maxAttempts !== null &&
  completedCount >= test.maxAttempts
) {
  return res.status(403).json({
    error: 'Maximum attempts reached',
    finalSubmissionId: submissions[0].id
  });
}

// 3️⃣ Create NEW submission (allowed)
const submission = await prisma.testSubmission.create({
  data: {
    testId: parseInt(id),
    studentId,
    status: 'IN_PROGRESS',
    score: 0
  }
});

    

    

    const durationInSeconds = test.duration * 60;
    const bufferInSeconds = 15 * 60; // 15 min buffer

    const examSessionToken = createExamSessionToken({
    submissionId: submission.id,
     testId: test.id,
    studentId: submission.studentId,
     expiresInSeconds: durationInSeconds + bufferInSeconds
     });

    res.json({
      message: 'Test started',
      startTime: submission.createdAt,
      submissionId: submission.id,
      examSessionToken
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
  try {
    if (!req.examSession) {
      return res.status(401).json({ error: 'Invalid or expired exam session' });
    }

    const { id } = req.params;
    const { answers, status } = req.body;
    const studentId = req.examSession.studentId;

    // ✅ FETCH submission FIRST
    const { submissionId } = req.examSession;

      const submission = await prisma.testSubmission.findUnique({
      where: { id: submissionId }
         });

      
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // ✅ NOW safe to check status
    if (submission.status !== 'IN_PROGRESS') {
      return res.status(400).json({
        error: 'Submission already finalized',
      });
    }

    if (req.examSession.status !== 'IN_PROGRESS') {
  return res.status(400).json({ error: 'Submission already closed' });
}


    // ----- scoring logic (unchanged) -----
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
        selectedAnswer: studentAnswer || 'No Answer',
        isCorrect,
        questionId: q.id,
        submissionId: submission.id,
      });
    }

    // ✅ CORRECTED TRANSACTION BLOCK
await prisma.$transaction([
  // 1. Delete old draft answers
  prisma.answer.deleteMany({ 
    where: { submissionId: submission.id } 
  }),
  
  // 2. Create final scored answer records
  prisma.answer.createMany({ 
    data: answerRecords 
  }),
  
  // 3. Update the submission record status and score
  prisma.testSubmission.update({
    where: { id: submission.id },
    data: {
      score,
      status: status === 'TIMEOUT' ? 'TIMEOUT' : 'COMPLETED',
    },
  }),
]);

    return res.json({ success: true, submissionId: submission.id });
  } catch (err) {
    console.error('Submit error:', err);
    return res.status(500).json({ error: 'Failed to submit test' });
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

export const autosaveTestProgress = async (req, res) => {
  try {
    // Use the verified data from the middleware
    const studentId = req.examSession.studentId;
    const submissionId = req.examSession.submissionId;
    const testId = req.examSession.testId;
    
    const { answers, markedQuestions } = req.body;

    // The middleware already confirmed this submission exists and is IN_PROGRESS
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

    res.json({ success: true });
  } catch (error) {
    console.error('Autosave error:', error);
    res.status(500).json({ error: 'Autosave failed' });
  }
};