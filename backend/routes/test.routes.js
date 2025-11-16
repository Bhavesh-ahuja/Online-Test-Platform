import express from 'express';
import { createTest, getAllTests } from '../controllers/test.controller.js';
import { authenticateToken, isAdmin } from '../middleware/auth.middleware.js';

const router = express.Router();

// GET /api/tests - Anyone logged in can see tests
router.get('/', authenticateToken, getAllTests);

// POST /api/tests -Only ADMINS can create tests
router.post('/', authenticateToken, isAdmin, createTest);

export default router;