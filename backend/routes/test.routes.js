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
  exportTestResultsPDF,
  autosaveTestProgress,
} from '../controllers/test.controller.js';
import multer from "multer";
import { validateRequest } from '../middleware/validate.middleware.js';
import { createTestSchema, updateTestSchema } from '../validators/test.validator.js';
import { authenticateToken, isAdmin } from '../middleware/auth.middleware.js';
import { getTestByIdForAdmin } from '../controllers/test.controller.js';
import { authenticateExamSession } from '../middleware/examSessionAuth.js';

const router = express.Router();

// --- MULTER CONFIGURATION (Memory Storage) ---
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB Limit
});

/**
 * ============================
 * GENERAL ROUTES (NO :id)
 * ============================
 */

// GET /api/tests - Anyone logged in can see all available tests
router.get('/', authenticateToken, getAllTests);

// POST /api/tests - Only ADMINS can create a new test
router.post('/', authenticateToken, isAdmin, validateRequest(createTestSchema), createTest);

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
// ADMIN: Get test with correct answers
router.get(
  '/:id/admin',
  authenticateToken,
  isAdmin,
  getTestByIdForAdmin
);
router.get('/results/:submissionId', authenticateToken, getTestResult);

// GET /api/tests/:id - Get test details by ID (User Token)
router.get('/:id', authenticateToken, getTestById);

// PUT /api/tests/:id - Admin only: Update test
router.put('/:id', authenticateToken, isAdmin, validateRequest(updateTestSchema), updateTest);

// DELETE /api/tests/:id - Admin only: Delete test
router.delete('/:id', authenticateToken, isAdmin, deleteTest);

// POST /api/tests/:id/start - Start a test
router.post('/:id/start', authenticateToken, startTest);

router.patch('/:id/autosave', authenticateExamSession, autosaveTestProgress);
router.post('/:id/submit', authenticateExamSession, submitTest);

/**
 * ============================
 * SUB-RESOURCES
 * ============================
 **/

// GET /api/tests/:id/submissions - Admin only: Get all submissions for a test
router.get('/:id/submissions', authenticateToken, isAdmin, getTestSubmissions);

// GET /api/tests/:id/export-pdf - Download Full Class Report
router.get('/:id/export-pdf', authenticateToken, isAdmin, exportTestResultsPDF);

// GET /api/tests/results/:submissionId - Get test result



export default router;
