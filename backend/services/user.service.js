import prisma from '../lib/prisma.js'

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
            throw new Error('User not found');
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