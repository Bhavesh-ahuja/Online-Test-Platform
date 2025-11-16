import express from 'express';
import { register, login } from '../controllers/auth.controller.js';

// Create a new router
const router = express.Router();

// Define the routes
router.post('/register', register);
router.post('/login', login);

// Export the router
export default router;