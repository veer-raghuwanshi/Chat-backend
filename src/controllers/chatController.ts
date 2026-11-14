import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as chatService from '../services/chatService';
import * as messageService from '../services/messageService';

export const createOrGetChat = asyncHandler(async (req: Request, res: Response) => {
  const { userAId, userBId } = req.body;
  const result = await chatService.createOrGetChat(userAId, userBId);
  res.status(result.isNew ? 201 : 200).json(result);
});

export const sendMessage = asyncHandler(async (req: Request, res: Response) => {
  const { chatId } = req.params;
  const { senderId, text } = req.body;
  const message = await messageService.sendMessage(chatId, senderId, text);
  res.status(201).json(message);
});

export const getMessages = asyncHandler(async (req: Request, res: Response) => {
  const { chatId } = req.params;
  const limit = req.query.limit ? Number(req.query.limit) : 50;
  const messages = await messageService.getMessages(chatId, limit);
  res.json({ count: messages.length, messages });
});

export const markMessageRead = asyncHandler(async (req: Request, res: Response) => {
  const { chatId, messageId } = req.params;
  const { userId } = req.body;
  const receipt = await messageService.markMessageRead(chatId, messageId, userId);
  res.json(receipt);
});

export const updateLastSeen = asyncHandler(async (req: Request, res: Response) => {
  const { chatId } = req.params;
  const { userId, messageId } = req.body;
  const record = await messageService.updateLastSeen(chatId, userId, messageId);
  res.json(record);
});

export const createGroupChat = asyncHandler(async (req: Request, res: Response) => {
  const { creatorId, name, memberIds } = req.body;
  const chat = await chatService.createGroupChat(creatorId, name, memberIds);
  res.status(201).json(chat);
});

export const editMessage = asyncHandler(async (req: Request, res: Response) => {
  const { chatId, messageId } = req.params;
  const { senderId, text } = req.body;
  const updated = await messageService.editMessage(chatId, messageId, senderId, text);
  res.json(updated);
});

export const deleteMessage = asyncHandler(async (req: Request, res: Response) => {
  const { chatId, messageId } = req.params;
  const { senderId } = req.body;
  const result = await messageService.deleteMessage(chatId, messageId, senderId);
  res.json(result);
});

