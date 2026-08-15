import { Router } from 'express';
import { getUsers, createUser, updateUser, deleteUser } from './users.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';

const router = Router();

router.use(authenticate);

// List users can be accessed by ADMIN, MANAGER, ENGINEER, OPERATOR (for assigning engineer or viewing profiles)
router.get('/', getUsers);

// CRUD modifications restricted to ADMIN
router.post('/', authorize('ADMIN'), createUser);
router.put('/:id', authorize('ADMIN'), updateUser);
router.delete('/:id', authorize('ADMIN'), deleteUser);

export default router;
