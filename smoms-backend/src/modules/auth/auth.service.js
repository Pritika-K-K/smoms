import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../config/db.js';

export const loginUser = async (email, password) => {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { department: true },
  });

  if (!user) {
    throw new Error('Invalid email or password');
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new Error('Invalid email or password');
  }

  const token = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET || 'smoms_default_secret',
    { expiresIn: '24h' }
  );

  const { passwordHash: _, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    token,
  };
};

export const getMe = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      departmentId: true,
      department: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  return user;
};

export const updateProfile = async (userId, { name, email, phone, password }) => {
  const data = {};
  if (name) data.name = name;
  if (phone !== undefined) data.phone = phone;
  if (email) {
    // Check if email already taken by another user
    const existing = await prisma.user.findFirst({
      where: { email, NOT: { id: userId } },
    });
    if (existing) {
      throw new Error('Email address is already in use by another user');
    }
    data.email = email;
  }
  if (password && password.trim().length > 0) {
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }
    data.passwordHash = await bcrypt.hash(password, 10);
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      departmentId: true,
      department: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return updatedUser;
};
