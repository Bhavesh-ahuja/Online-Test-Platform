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
  deleteTest,
  uploadTestPDF,
  startTest,
  autosaveTestProgress,
} from '../controllers/test.controller.js';
import multer from "multer";
import { authenticateToken, isAdmin } from '../middleware/auth.middleware.js';
import { getTestByIdForAdmin } from '../controllers/test.controller.js';

const router = express.Router();

// --- MULTER CONFIGURATION (Memory Storage) ---
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

/**
 * ============================
 * GENERAL ROUTES (NO :id)
 * ============================
 */

// GET /api/tests - Anyone logged in can see all available tests
router.get('/', authenticateToken, getAllTests);

// POST /api/tests - Only ADMINS can create a new test
router.post('/', authenticateToken, isAdmin, createTest);
// ADMIN route – returns correct answers (for Edit Test)
router.get('/:id/admin', getTestByIdForAdmin);


// POST /api/tests/upload-pdf - Admin only: Upload test PDF
router.post(
  '/upload-pdf',
  authenticateToken,
  isAdmin,
  upload.single('file'),
  uploadTestPDF
);

// GET /api/tests/my-submissions - Get all submissions of logged-in user
// IMPORTANT: Must come BEFORE `/:id`
router.get('/my-submissions', authenticateToken, getMySubmissions);

/**
 * ============================
 * TEST ROUTES (WITH :id)
 * ============================
 */

// GET /api/tests/:id - Get test details by ID
router.get('/:id', authenticateToken, getTestById);

// PUT /api/tests/:id - Admin only: Update test
router.put('/:id', authenticateToken, isAdmin, updateTest);

// DELETE /api/tests/:id - Admin only: Delete test
router.delete('/:id', authenticateToken, isAdmin, deleteTest);

// POST /api/tests/:id/start - Start a test
router.post('/:id/start', authenticateToken, startTest);

// POST /api/tests/:id/submit - Submit test answers
router.post('/:id/submit', authenticateToken, submitTest);

router.patch('/:id/autosave', authenticateToken, autosaveTestProgress);


/**
 * ============================
 * SUB-RESOURCES
 * ============================
 **/

// GET /api/tests/:id/submissions - Admin only: Get all submissions for a test
router.get('/:id/submissions', authenticateToken, isAdmin, getTestSubmissions);

// GET /api/tests/results/:submissionId - Get test result
router.get('/results/:submissionId', authenticateToken, getTestResult);

export default router;
