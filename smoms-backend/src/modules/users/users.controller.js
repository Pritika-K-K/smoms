import * as userService from './users.service.js';
import { logAudit } from '../../middleware/auditLogger.js';

export const getUsers = async (req, res, next) => {
  try {
    const { role, departmentId } = req.query;
    const users = await userService.getAllUsers(role, departmentId);
    return res.status(200).json({ success: true, data: users });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, departmentId } = req.body;
    if (!name || !email || !role) {
      return res.status(400).json({ success: false, message: 'Name, email, and role are required' });
    }

    const newUser = await userService.createUser({ name, email, password, role, departmentId });
    await logAudit(req.user.id, 'CREATE_USER', 'User', newUser.id);

    return res.status(201).json({ success: true, data: newUser, message: 'User created successfully' });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await userService.updateUser(id, req.body);
    await logAudit(req.user.id, 'UPDATE_USER', 'User', id);

    return res.status(200).json({ success: true, data: updated, message: 'User updated successfully' });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    await userService.deleteUser(id);
    await logAudit(req.user.id, 'DELETE_USER', 'User', id);

    return res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};
