import prisma from '../lib/prisma.js';
import AppError from '../utils/AppError.js';

class UserService {
    async getProfile(userId) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                role: true,
                createdAt: true
            }
        });

        if (!user) {
            throw new AppError('User not found', 404);
        }

        return user;
    }

    async getAllUsers() {
        return await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                role: true,
                createdAt: true,
            },
        });
    }
}

export default new UserService();
