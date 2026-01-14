import { verifyExamSessionToken } from '../lib/examSessionToken.js';

export const authenticateExamSession = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Exam session token missing' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyExamSessionToken(token);
    req.examSession = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Exam session expired or invalid' });
  }
};
