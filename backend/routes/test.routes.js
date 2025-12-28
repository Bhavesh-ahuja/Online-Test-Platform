import express from 'express';
import {
  createTest,
  getAllTests,
  getTestById,
  submitTest,
  getTestResult,
  getMySubmissions,
  getTestSubmissions,
  updateTest,
  deleteTest
} from '../controllers/test.controller.js';
import { authenticateToken, isAdmin } from '../middleware/auth.middleware.js';

const router = express.Router();

// GET /api/tests - Anyone logged in can see all available tests
router.get('/', authenticateToken, getAllTests);

// POST /api/tests - Only ADMINS can create a new test
router.post('/', authenticateToken, isAdmin, createTest);

// GET /api/tests/:id - Get details of a single test by ID
router.get('/:id', authenticateToken, getTestById);

// POST /api/tests/:id/submit - Submit answers for a specific test
router.post('/:id/submit', authenticateToken, submitTest);

// GET /api/tests/results/:submissionId - Get result of a submitted test
router.get('/results/:submissionId', authenticateToken, getTestResult);

// GET /api/tests/my-submissions - Get all submissions of the logged-in user
router.get('/my-submissions', authenticateToken, getMySubmissions);

// GET /api/tests/:id/submissions - Admin only: Get all submissions for a specific test
router.get('/:id/submissions', authenticateToken, isAdmin, getTestSubmissions);

// PUT /api/tests/:id - Admin only: Update an existing test
router.put('/:id', authenticateToken, isAdmin, updateTest);

// DELETE Test
router.delete('/:id', authenticateToken, isAdmin, deleteTest);

export default router;
