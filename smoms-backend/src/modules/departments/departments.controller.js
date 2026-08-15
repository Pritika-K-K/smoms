import * as deptService from './departments.service.js';
import { logAudit } from '../../middleware/auditLogger.js';

export const getDepartments = async (req, res, next) => {
  try {
    const depts = await deptService.getDepartments();
    return res.status(200).json({ success: true, data: depts });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createDepartment = async (req, res, next) => {
  try {
    const { name, code, description, managerId } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Department name is required' });

    const newDept = await deptService.createDepartment({ name, code, description, managerId });
    await logAudit(req.user.id, 'CREATE_DEPARTMENT', 'Department', newDept.id);

    return res.status(201).json({ success: true, data: newDept, message: 'Department created successfully' });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const updateDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, code, description, managerId } = req.body;
    const updated = await deptService.updateDepartment(id, { name, code, description, managerId });
    await logAudit(req.user.id, 'UPDATE_DEPARTMENT', 'Department', id);

    return res.status(200).json({ success: true, data: updated, message: 'Department updated successfully' });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;
    await deptService.deleteDepartment(id);
    await logAudit(req.user.id, 'DELETE_DEPARTMENT', 'Department', id);

    return res.status(200).json({ success: true, message: 'Department deleted' });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};
