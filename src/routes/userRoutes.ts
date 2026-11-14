import { Router } from 'express';
import * as userController from '../controllers/userController';
import { validate } from '../middlewares/validate';
import * as schemas from '../validators/userSchemas';

const router = Router();

// 6. List User Chats
router.get('/:userId/chats', validate(schemas.getUserChats), userController.getUserChats);

// Helper: List seeded users
router.get('/list', userController.listUsers);

export default router;

