import { z } from 'zod';

export const registerSchema = z.object({
    email: z.string().email('Invalid email format'),
    firstName: z.string().min(1, 'First Name is required'),
    lastName: z.string().min(1, 'Last Name is required'),
    password: z.string().min(6, 'Password must be at least 6 character long'),
    password: z.string().min(6, 'Password must be at least 6 characters long'),
    fullName: z.string().min(1, 'Full name is required'),    // Added
    badgeNumber: z.string().min(1, 'Badge number is required'), // Added
    year: z.string().min(1, 'Year is required'),               // Added
    prn: z.string().min(1, 'PRN is required'),                 // Added
    role: z.enum(['STUDENT', 'ADMIN']).optional(),
});

export const loginSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
});