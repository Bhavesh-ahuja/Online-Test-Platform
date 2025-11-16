import jwt from 'jsonwebtoken';

export const authenticateToken = (req, res, next) => {
    // Get token from header (Format: "Bearer <token>")
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.'});
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified; // Attch user info (id, role to the request)
        next(); // Continue to the next function
    } catch (error) {
        res.status(403).json({ error: 'Invalid token' });
    }
};

export const isAdmin = (req, res, next) => {
    if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Access denied. Admins onplay.'});
    }
    next();
};