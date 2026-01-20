import { z } from 'zod';

export const createTestSchema = z.object({
    title: z.string().min(3, 'Title must be at least 3 characters'),
    description: z.string().optional(),
    duration: z.coerce.number().int().positive('Duration must be a positive integer'),
    scheduledStart: z.string().datetime().nullable().optional(),
    scheduledEnd: z.string().datetime().nullable().optional(),
    questions: z.array(z.object({
        text: z.string().min(1, 'Question text is required'),
        type: z.enum(['MCQ', 'SHORT']),
        options: z.array(z.string()),
        correctAnswer: z.string().min(1, 'Correct answer is required')
    })).min(1, 'At least one question is required'),
});

export const updateTestSchema = createTestSchema.partial().extend({
    attemptType: z.enum(['ONCE', 'LIMITED', 'UNLIMITED']).optional(),
    maxAttempts: z.coerce.number().int().positive().nullable().optional(),
});
