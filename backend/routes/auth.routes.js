import express from 'express';
import { register, login } from '../controllers/auth.controller.js';
import { validateRequest } from '../middleware/validate.middleware.js';
import { registerSchema, loginSchema } from '../validators/auth.validator.js';

// Create a new router
const router = express.Router();

// Define the routes
router.post('/register', validateRequest(registerSchema) , register);
router.post('/login',validateRequest(loginSchema) , login);

// Export the router
export default router;