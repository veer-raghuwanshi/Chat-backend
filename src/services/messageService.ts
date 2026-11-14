import crypto from 'crypto';
import { getFirestore } from '../config/firebase';
import { checkChatExists, isMember } from './chatService';
import { BadRequestError, ForbiddenError, NotFoundError } from '../utils/errors';
import { Message, ReadReceipt, LastSeenRecord } from '../types';

function messagesCol(chatId: string) {
  const db = getFirestore();
  return db.collection('chats').doc(chatId).collection('messages');
}

function lastSeenCol(chatId: string) {
  const db = getFirestore();
  return db.collection('chats').doc(chatId).collection('lastSeen');
}

export async function sendMessage(chatId: string, senderId: string, text: string): Promise<Message> {
  if (!text || !text.trim()) throw new BadRequestError('Message text cannot be empty');

  // Verify chat & membership in relational DB
  await checkChatExists(chatId);
  const member = await isMember(chatId, senderId);
  if (!member) throw new ForbiddenError(`User '${senderId}' is not a member of this chat`);

  const messageId = 'msg_' + crypto.randomUUID();
  const now = new Date().toISOString();

  const message: Message = {
    id: messageId,
    chatId,
    senderId,
    text: text.trim(),
    createdAt: now,
    isDeleted: false,
    readBy: [],
  };

  await messagesCol(chatId).doc(messageId).set(message);

  // Automatically update sender's last seen to this message
  await updateLastSeen(chatId, senderId, messageId);

  return message;
}

export async function getMessages(chatId: string, limitCount = 50): Promise<Message[]> {
  await checkChatExists(chatId);

  const safeLimit = Math.min(Math.max(limitCount, 1), 100);

  const snapshot = await messagesCol(chatId)
    .orderBy('createdAt', 'asc')
    .limit(safeLimit)
    .get();

  const messages: Message[] = [];
  snapshot.docs.forEach((doc: any) => {
    const data = doc.data();
    messages.push({
      id: data.id || doc.id,
      chatId: data.chatId || chatId,
      senderId: data.senderId,
      text: data.isDeleted ? 'This message was deleted' : data.text,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      isDeleted: data.isDeleted || false,
      readBy: data.readBy || [],
    });
  });

  return messages;
}

export async function markMessageRead(chatId: string, messageId: string, userId: string): Promise<ReadReceipt> {
  const member = await isMember(chatId, userId);
  if (!member) throw new ForbiddenError(`User '${userId}' is not a member of this chat`);

  const msgRef = messagesCol(chatId).doc(messageId);
  const doc = await msgRef.get();

  if (!doc.exists) throw new NotFoundError(`Message '${messageId}' not found`);

  const data = doc.data()!;
  const readBy: ReadReceipt[] = data.readBy || [];

  const existing = readBy.find((r) => r.userId === userId);
  if (existing) return existing;

  const newReceipt: ReadReceipt = {
    userId,
    readAt: new Date().toISOString(),
  };

  readBy.push(newReceipt);
  await msgRef.update({ readBy });

  // Update last seen pointer
  await updateLastSeen(chatId, userId, messageId);

  return newReceipt;
}

export async function updateLastSeen(chatId: string, userId: string, messageId: string): Promise<LastSeenRecord> {
  const member = await isMember(chatId, userId);
  if (!member) throw new ForbiddenError(`User '${userId}' is not a member of this chat`);

  const record: LastSeenRecord = {
    userId,
    messageId,
    chatId,
    updatedAt: new Date().toISOString(),
  };

  await lastSeenCol(chatId).doc(userId).set(record);
  return record;
}

export async function editMessage(chatId: string, messageId: string, senderId: string, newText: string): Promise<Message> {
  if (!newText?.trim()) throw new BadRequestError('Updated text cannot be empty');

  const msgRef = messagesCol(chatId).doc(messageId);
  const doc = await msgRef.get();

  if (!doc.exists) throw new NotFoundError(`Message '${messageId}' not found`);
  const data = doc.data()!;

  if (data.senderId !== senderId) throw new ForbiddenError('You can only edit your own messages');
  if (data.isDeleted) throw new BadRequestError('Cannot edit a deleted message');

  const updatedAt = new Date().toISOString();
  await msgRef.update({ text: newText.trim(), updatedAt });

  return { ...data, text: newText.trim(), updatedAt };
}

export async function deleteMessage(chatId: string, messageId: string, senderId: string) {
  const msgRef = messagesCol(chatId).doc(messageId);
  const doc = await msgRef.get();

  if (!doc.exists) throw new NotFoundError(`Message '${messageId}' not found`);
  const data = doc.data()!;

  if (data.senderId !== senderId) throw new ForbiddenError('You can only delete your own messages');

  await msgRef.update({ isDeleted: true, text: '', updatedAt: new Date().toISOString() });
  return { success: true, messageId };
}
