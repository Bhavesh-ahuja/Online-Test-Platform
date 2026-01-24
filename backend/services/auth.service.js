import prisma from '../lib/prisma.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import AppError from '../utils/AppError.js';

class AuthService {
  async register(email, password, fullName, badgeNumber, year, prn, role = 'STUDENT') {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new AppError('Email already in use', 400);
    }

    // Check if PRN is already registered to maintain unique identity
    const existingPrn = await prisma.user.findUnique({ where: { prn } });
    if (existingPrn) {
      throw new AppError('PRN already registered', 400);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await prisma.user.create({
      data: { 
        email, 
        password: hashedPassword, 
        fullName,      // Saved as a single string
        badgeNumber,   // Saved as provided by user
        year,          // Saved as provided by user
        prn,           // Saved as provided by user
        role, firstName, lastName 
      },
      select: { id: true, email: true, role: true, firstName: true, lastName: true }
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