import { z } from 'zod';

export const createChat = {
  body: z.object({
    userAId: z.string().min(1, 'userAId is required'),
    userBId: z.string().min(1, 'userBId is required'),
  }),
};

export const sendMessage = {
  params: z.object({
    chatId: z.string().min(1),
  }),
  body: z.object({
    senderId: z.string().min(1),
    text: z.string().min(1),
  }),
};

export const getMessages = {
  params: z.object({
    chatId: z.string().min(1),
  }),
  query: z.object({
    limit: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 50)),
  }),
};

export const markRead = {
  params: z.object({
    chatId: z.string().min(1),
    messageId: z.string().min(1),
  }),
  body: z.object({
    userId: z.string().min(1),
  }),
};

export const updateLastSeen = {
  params: z.object({
    chatId: z.string().min(1),
  }),
  body: z.object({
    userId: z.string().min(1),
    messageId: z.string().min(1),
  }),
};

export const createGroup = {
  body: z.object({
    creatorId: z.string().min(1),
    name: z.string().min(1),
    memberIds: z.array(z.string()).min(1),
  }),
};

export const editMessage = {
  params: z.object({
    chatId: z.string().min(1),
    messageId: z.string().min(1),
  }),
  body: z.object({
    senderId: z.string().min(1),
    text: z.string().min(1),
  }),
};

export const deleteMessage = {
  params: z.object({
    chatId: z.string().min(1),
    messageId: z.string().min(1),
  }),
  body: z.object({
    senderId: z.string().min(1),
  }),
};

