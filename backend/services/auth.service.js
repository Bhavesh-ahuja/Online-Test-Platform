import prisma from '../lib/prisma.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import AppError from '../utils/AppError.js';

class AuthService {
  async register(data) {
    const {
      firstName,
      lastName,
      email,
      password,

      role = 'STUDENT',
    } = data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new AppError('Email already in use', 400);
    }



    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword,

        role,
      },
    });

    return newUser;
  }



  async login(email, password) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new AppError('Invalid credentials', 401);
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );

    // Return user details including identity fields so the frontend can store them
    const { password: _, ...userWithoutPassword } = user;
    return {
      user: userWithoutPassword,
      token,
    };
  }
}

export default new AuthService();