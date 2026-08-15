import { loginUser, getMe, updateProfile } from './auth.service.js';
import { logAudit } from '../../middleware/auditLogger.js';

export const handleLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const result = await loginUser(email, password);
    await logAudit(result.user.id, 'USER_LOGIN', 'User', result.user.id);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const handleGetMe = async (req, res, next) => {
  try {
    const user = await getMe(req.user.id);
    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const handleUpdateProfile = async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;
    const updatedUser = await updateProfile(req.user.id, { name, email, phone, password });
    await logAudit(req.user.id, 'UPDATE_PROFILE', 'User', req.user.id);

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};
