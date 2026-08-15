import { getAuditLogs } from './auditLogs.service.js';

export const handleGetAuditLogs = async (req, res, next) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 100;
    const logs = await getAuditLogs(limit);
    return res.status(200).json({ success: true, data: logs });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
