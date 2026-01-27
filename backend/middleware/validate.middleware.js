import AppError from '../utils/AppError.js';

export const validateRequest = (schema) => (req, res, next) => {
    try {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            console.log("Validation Failed. Result:", JSON.stringify(result, null, 2));

            // Zod v3 uses .errors, v4 might use .issues or flattened structure
            const issues = result.error?.errors || result.error?.issues || [];

            const errorMessages = issues.length > 0
                ? issues.map((error) => error.message)
                : ['Invalid input data (unknown validation error)'];

            // Join for legacy message, pass array for new structured handling
            return next(new AppError('Validation Error', 400, errorMessages));
        }
        // Attach typed/parsed body to request
        req.body = result.data;
        next();
    } catch (error) {
        console.error("Validation Middleware Error:", error);
        next(new AppError(`Internal Validation Error: ${error.message}`, 500));
    }
};
