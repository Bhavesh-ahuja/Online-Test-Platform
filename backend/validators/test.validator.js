import { z } from 'zod';

export const createTestSchema = z.object({
    title: z.string().min(3, 'Title must be at least 3 characters'),
    description: z.string().optional(),
    duration: z.coerce.number().int().positive('Duration must be a positive integer'),
    scheduledStart: z.string().datetime().nullable().optional(),
    scheduledEnd: z.string().datetime().nullable().optional(),
    showResult: z.boolean().optional().default(true),

    // New Fields
    type: z.enum(['STANDARD', 'SWITCH', 'DIGIT', 'GEOSUDO', 'MOTION']).optional().default('STANDARD'),
    switchConfig: z.object({
        durationSeconds: z.number().optional(),
        maxLevel: z.number().optional()
    }).optional(),

    motionConfig: z.object({
        durationSeconds: z.number().optional()
    }).optional(),

    attemptType: z.enum(['ONCE', 'LIMITED', 'UNLIMITED']).optional(),
    maxAttempts: z.coerce.number().int().positive().nullable().optional(),

    questions: z.array(z.object({
        text: z.string().min(1, 'Question text is required'),
        type: z.enum(['MCQ', 'SHORT']),
        options: z.array(z.string()),
        correctAnswer: z.string().min(1, 'Correct answer is required')
    })).optional()
});

export const updateTestSchema = createTestSchema.partial().extend({
    attemptType: z.enum(['ONCE', 'LIMITED', 'UNLIMITED']).optional(),
    maxAttempts: z.coerce.number().int().positive().nullable().optional(),
});
