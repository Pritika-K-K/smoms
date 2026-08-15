import { Router } from 'express';
import { handleLogin, handleGetMe, handleUpdateProfile } from './auth.controller.js';
import { authenticate } from '../../middleware/authenticate.js';

const router = Router();

router.post('/login', handleLogin);
router.get('/me', authenticate, handleGetMe);
router.put('/profile', authenticate, handleUpdateProfile);

export default router;
