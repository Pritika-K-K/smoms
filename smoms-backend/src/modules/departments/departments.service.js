import prisma from '../../config/db.js';

export const getDepartments = async () => {
  return await prisma.department.findMany({
    include: {
      _count: {
        select: { users: true, machines: true },
      },
    },
    orderBy: { name: 'asc' },
  });
};

export const createDepartment = async ({ name, code, description, managerId }) => {
  let cleanCode = code ? code.trim().toUpperCase() : '';
  if (!cleanCode) {
    cleanCode = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 4) || 'DEPT';
  }

  // Ensure unique code
  let uniqueCode = cleanCode;
  let counter = 1;
  while (await prisma.department.findFirst({ where: { code: uniqueCode } })) {
    uniqueCode = `${cleanCode}${counter}`;
    counter++;
  }

  return await prisma.department.create({
    data: {
      name: name.trim(),
      code: uniqueCode,
      description: description || null,
      managerId: managerId || null,
    },
  });
};

export const updateDepartment = async (id, { name, code, description, managerId }) => {
  const updateData = {};
  if (name !== undefined) updateData.name = name.trim();
  if (description !== undefined) updateData.description = description || null;
  if (managerId !== undefined) updateData.managerId = managerId || null;
  if (code !== undefined) {
    const cleanCode = code.trim().toUpperCase();
    if (cleanCode) {
      const existing = await prisma.department.findFirst({ where: { code: cleanCode, id: { not: id } } });
      if (existing) throw new Error(`Department code "${cleanCode}" is already taken by another department`);
      updateData.code = cleanCode;
    }
  }

  return await prisma.department.update({
    where: { id },
    data: updateData,
  });
};

export const deleteDepartment = async (id) => {
  return await prisma.department.delete({
    where: { id },
  });
};
