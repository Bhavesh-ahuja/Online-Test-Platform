import express from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { getMyProfile } from '../controllers/user.controller.js';

const router = express.Router();

// GET /api/users/me
router.get('/me', authenticateToken, getMyProfile);

export default router;
