import bcrypt from 'bcryptjs';
import prisma from '../../config/db.js';

export const getAllUsers = async (roleFilter, departmentId) => {
  const where = {};
  if (roleFilter) where.role = roleFilter;
  if (departmentId) where.departmentId = departmentId;

  return await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      departmentId: true,
      department: { select: { id: true, name: true } },
      createdAt: true,
    },
    orderBy: { name: 'asc' },
  });
};

export const createUser = async ({ name, email, password, role, departmentId }) => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error('Email is already registered');
  }

  const passwordHash = await bcrypt.hash(password || 'password123', 10);

  return await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role,
      departmentId: departmentId || null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      departmentId: true,
      department: { select: { id: true, name: true } },
      createdAt: true,
    },
  });
};

export const updateUser = async (id, { name, email, role, departmentId, password }) => {
  const data = {};
  if (name) data.name = name;
  if (email) data.email = email;
  if (role) data.role = role;
  if (departmentId !== undefined) data.departmentId = departmentId || null;
  if (password) {
    data.passwordHash = await bcrypt.hash(password, 10);
  }

  return await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      departmentId: true,
      department: { select: { id: true, name: true } },
      updatedAt: true,
    },
  });
};

export const deleteUser = async (id) => {
  return await prisma.user.delete({
    where: { id },
  });
};
