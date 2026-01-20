import AppError from '../utils/AppError.js';

export const validateRequest = (schema) => (req, res, next) => {
    try {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            const errorMessages = result.error.errors.map((error) => error.message).join(', ');
            return next(new AppError(`Validation Error: ${errorMessages}`, 400));
        }
        // Attach typed/parsed body to request
        req.body = result.data;
        next();
    } catch (error) {
        next(new AppError('Internal Validation Error', 500));
    }
};
