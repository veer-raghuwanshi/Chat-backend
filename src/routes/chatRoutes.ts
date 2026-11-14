import { Router } from 'express';
import * as chatController from '../controllers/chatController';
import { validate } from '../middlewares/validate';
import * as schemas from '../validators/chatSchemas';

const router = Router();

// 1. Create or Get Chat
router.post('/create', validate(schemas.createChat), chatController.createOrGetChat);

// 2. Send Message
router.post('/:chatId/message/send', validate(schemas.sendMessage), chatController.sendMessage);

// 3. Get Messages
router.get('/:chatId/messages', validate(schemas.getMessages), chatController.getMessages);

// 4. Mark Message Read
router.post('/:chatId/message/:messageId/read', validate(schemas.markRead), chatController.markMessageRead);

// 5. Update Last Seen
router.post('/:chatId/lastseen', validate(schemas.updateLastSeen), chatController.updateLastSeen);

// Group chats & message edit/delete
router.post('/group/create', validate(schemas.createGroup), chatController.createGroupChat);
router.patch('/:chatId/message/:messageId', validate(schemas.editMessage), chatController.editMessage);
router.delete('/:chatId/message/:messageId', validate(schemas.deleteMessage), chatController.deleteMessage);

export default router;

