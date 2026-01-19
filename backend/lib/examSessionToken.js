import jwt from 'jsonwebtoken';

const EXAM_SESSION_SECRET = process.env.EXAM_SESSION_SECRET;

export const createExamSessionToken = ({
  submissionId,
  testId,
  studentId,
  expiresInSeconds
}) => {
  return jwt.sign(
    {
      submissionId,
      testId,
      studentId
    },
    EXAM_SESSION_SECRET,
    {
      expiresIn: expiresInSeconds
    }
  );
};

export const verifyExamSessionToken = (token) => {
  return jwt.verify(token, EXAM_SESSION_SECRET);
};
