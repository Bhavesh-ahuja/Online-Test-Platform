// Import required packages
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import routes
import authRoutes from './routes/auth.routes.js';
import testRoutes from './routes/test.routes.js';
import userRoutes from './routes/test.routes.js';

// Initialize dotenv to load .env variables
dotenv.config();

// Initialize Express app
const app = express();
const port = process.env.PORT || 8000;


// --- Middleware ---
// Enable CORS for all routes
app.use(cors());
// Enable built-in JSON parsing for request bodies
app.use(express.json());

// --- API Routes ---

// All routes in 'authRoutes' will be prefixed with /api/auth
app.use('/api/auth', authRoutes);

// All routes in 'testRoutes' will be prefixed with /api/tests
app.use('/api/tests', testRoutes);

// All routes in 'userRoutes' will be prefixed with /api/users
app.use('/api/users', userRoutes);

// --- Error Handling Middleware ---
import errorHandler from './middleware/error.middleware.js';
app.use(errorHandler);

// --- Start the Server ---
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});