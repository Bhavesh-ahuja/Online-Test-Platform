import express from 'express';
import { authenticateToken, isAdmin } from '../middleware/auth.middleware.js';
import { getMyProfile, getAllUsers } from '../controllers/user.controller.js';

const router = express.Router();

// GET /api/users/me
router.get('/me', authenticateToken, getMyProfile);

// Get /api/users -Admin only
router.get('/', authenticateToken, isAdmin, getAllUsers);

export default router;
