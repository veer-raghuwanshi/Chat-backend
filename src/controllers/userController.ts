import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as chatService from '../services/chatService';

export const getUserChats = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const chats = await chatService.getUserChats(userId);
  res.json({ count: chats.length, chats });
});

export const listUsers = asyncHandler(async (_req: Request, res: Response) => {
  const users = await chatService.getAllUsers();
  res.json({ count: users.length, users });
});

