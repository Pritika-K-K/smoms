import * as machineService from './machines.service.js';
import { logAudit } from '../../middleware/auditLogger.js';

export const getMachines = async (req, res, next) => {
  try {
    const { departmentId, status } = req.query;
    // If operator, filter by their department unless explicitly specified
    let targetDept = departmentId;
    if (req.user.role === 'OPERATOR' && !targetDept && req.user.departmentId) {
      targetDept = req.user.departmentId;
    }

    const machines = await machineService.getAllMachines(targetDept, status);
    return res.status(200).json({ success: true, data: machines });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getMachineById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const machine = await machineService.getMachineById(id);
    if (!machine) {
      return res.status(404).json({ success: false, message: 'Machine not found' });
    }
    return res.status(200).json({ success: true, data: machine });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createMachine = async (req, res, next) => {
  try {
    const { name, departmentId, status } = req.body;
    if (!name || !departmentId) {
      return res.status(400).json({ success: false, message: 'Name and departmentId are required' });
    }

    const machine = await machineService.createMachine({ name, departmentId, status });
    await logAudit(req.user.id, 'CREATE_MACHINE', 'Machine', machine.id);

    return res.status(201).json({ success: true, data: machine, message: 'Machine created successfully' });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const updateMachine = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await machineService.updateMachine(id, req.body);
    await logAudit(req.user.id, 'UPDATE_MACHINE', 'Machine', id);

    return res.status(200).json({ success: true, data: updated, message: 'Machine updated successfully' });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteMachine = async (req, res, next) => {
  try {
    const { id } = req.params;
    await machineService.deleteMachine(id);
    await logAudit(req.user.id, 'DELETE_MACHINE', 'Machine', id);

    return res.status(200).json({ success: true, message: 'Machine deleted successfully' });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const getMachineTelemetry = async (req, res, next) => {
  try {
    const { id } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;
    const readings = await machineService.getMachineTelemetry(id, limit);
    return res.status(200).json({ success: true, data: readings });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
