import AppError from '../utils/AppError.js';

export const validateRequest = (schema) => (req, res, next) => {
    try {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            const errorMessages = result.error.errors.map((error) => error.message);
            // Join for legacy message, pass array for new structured handling
            return next(new AppError('Validation Error', 400, errorMessages));
        }
        // Attach typed/parsed body to request
        req.body = result.data;
        next();
    } catch (error) {
        next(new AppError('Internal Validation Error', 500));
    }
};
