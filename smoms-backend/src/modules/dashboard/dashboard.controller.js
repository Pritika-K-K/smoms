import { getDashboardStats } from './dashboard.service.js';

export const handleGetDashboard = async (req, res, next) => {
  try {
    const data = await getDashboardStats(req.user);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
