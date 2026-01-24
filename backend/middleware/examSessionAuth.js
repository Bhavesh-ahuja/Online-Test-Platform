import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';

export const authenticateExamSession = async (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing exam session token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.EXAM_SESSION_SECRET);

    const submission = await prisma.testSubmission.findUnique({
      where: { id: decoded.submissionId }
    });

    // 🔴 HARD STOP: submission must exist AND be IN_PROGRESS
    if (
      !submission ||
      submission.studentId !== decoded.studentId
    ) {
      return res.status(401).json({
        error: 'Invalid exam session'
      });
    }

    // 🔴 Security Check: Ensure token matches the requested Test ID
    if (req.params.id && submission.testId !== parseInt(req.params.id)) {
      return res.status(403).json({
        error: 'Session token invalid for this test'
      });
    }


    // Attach to request (single source of truth)
    req.examSession = {
      submissionId: submission.id,
      testId: submission.testId,
      studentId: submission.studentId,
      status: submission.status
    };

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid exam session token' });
  }
};
