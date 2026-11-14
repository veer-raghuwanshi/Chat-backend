import crypto from 'crypto';
import { pool, isDbConnected } from '../config/db';
import { BadRequestError, NotFoundError, ForbiddenError } from '../utils/errors';
import { Chat, UserChatResponse } from '../types';
import { memoryUsers, memoryChats, memoryMembers } from '../db/seed';

export async function createOrGetChat(userAId: string, userBId: string): Promise<{ chatId: string; isNew: boolean }> {
  if (!userAId || !userBId) {
    throw new BadRequestError('userAId and userBId are required');
  }

  if (userAId === userBId) {
    throw new BadRequestError('Cannot start a direct chat with yourself');
  }

  // 1. Verify users exist
  await verifyUserExists(userAId);
  await verifyUserExists(userBId);

  // 2. Check for existing 1:1 chat
  if (isDbConnected()) {
    const existing = await pool.query<{ id: string }>(
      `SELECT c.id FROM chats c
       JOIN chat_members cm1 ON c.id = cm1.chat_id AND cm1.user_id = $1
       JOIN chat_members cm2 ON c.id = cm2.chat_id AND cm2.user_id = $2
       WHERE c.type = 'DIRECT' LIMIT 1`,
      [userAId, userBId]
    );

    if (existing.rows[0]) {
      return { chatId: existing.rows[0].id, isNew: false };
    }

    // Create new direct chat
    const client = await pool.connect();
    const chatId = crypto.randomUUID();
    try {
      await client.query('BEGIN');
      await client.query(`INSERT INTO chats (id, type) VALUES ($1, 'DIRECT')`, [chatId]);
      await client.query(
        `INSERT INTO chat_members (id, chat_id, user_id) VALUES ($1, $2, $3), ($4, $2, $5)`,
        [crypto.randomUUID(), chatId, userAId, crypto.randomUUID(), userBId]
      );
      await client.query('COMMIT');
      return { chatId, isNew: true };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // Memory fallback for offline test
  for (const chat of memoryChats.values()) {
    if (chat.type !== 'DIRECT') continue;
    if (memoryMembers.has(`${chat.id}:${userAId}`) && memoryMembers.has(`${chat.id}:${userBId}`)) {
      return { chatId: chat.id, isNew: false };
    }
  }

  const chatId = crypto.randomUUID();
  memoryChats.set(chatId, { id: chatId, type: 'DIRECT', createdAt: new Date(), updatedAt: new Date() });
  memoryMembers.set(`${chatId}:${userAId}`, { id: crypto.randomUUID(), chatId, userId: userAId, role: 'MEMBER' });
  memoryMembers.set(`${chatId}:${userBId}`, { id: crypto.randomUUID(), chatId, userId: userBId, role: 'MEMBER' });
  return { chatId, isNew: true };
}

export async function getUserChats(userId: string): Promise<UserChatResponse[]> {
  await verifyUserExists(userId);

  if (isDbConnected()) {
    const res = await pool.query<{
      chatId: string;
      type: 'DIRECT' | 'GROUP';
      name: string | null;
      createdAt: Date;
      memberIds: string[];
    }>(
      `SELECT c.id AS "chatId", c.type, c.name, c.created_at AS "createdAt",
              ARRAY_AGG(cm_all.user_id) AS "memberIds"
       FROM chats c
       JOIN chat_members cm_user ON c.id = cm_user.chat_id AND cm_user.user_id = $1
       JOIN chat_members cm_all ON c.id = cm_all.chat_id
       GROUP BY c.id, c.type, c.name, c.created_at
       ORDER BY c.created_at DESC`,
      [userId]
    );

    return res.rows.map((r) => ({
      chatId: r.chatId,
      type: r.type,
      name: r.name,
      memberIds: r.memberIds,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  // Memory fallback
  const result: UserChatResponse[] = [];
  for (const m of memoryMembers.values()) {
    if (m.userId === userId) {
      const chat = memoryChats.get(m.chatId);
      if (!chat) continue;
      const memberIds = Array.from(memoryMembers.values())
        .filter((mem) => mem.chatId === m.chatId)
        .map((mem) => mem.userId);

      result.push({
        chatId: chat.id,
        type: chat.type,
        name: chat.name,
        memberIds,
        createdAt: chat.createdAt.toISOString(),
      });
    }
  }
  return result;
}

export async function createGroupChat(creatorId: string, name: string, memberIds: string[]): Promise<Chat> {
  if (!name.trim()) throw new BadRequestError('Group name is required');
  await verifyUserExists(creatorId);

  const uniqueMembers = Array.from(new Set([creatorId, ...memberIds]));
  for (const id of uniqueMembers) {
    await verifyUserExists(id);
  }

  const chatId = crypto.randomUUID();
  const now = new Date();

  if (isDbConnected()) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`INSERT INTO chats (id, type, name) VALUES ($1, 'GROUP', $2)`, [chatId, name]);
      for (const mId of uniqueMembers) {
        await client.query(
          `INSERT INTO chat_members (id, chat_id, user_id, role) VALUES ($1, $2, $3, $4)`,
          [crypto.randomUUID(), chatId, mId, mId === creatorId ? 'ADMIN' : 'MEMBER']
        );
      }
      await client.query('COMMIT');
      return { id: chatId, type: 'GROUP', name, createdAt: now, updatedAt: now };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  const groupChat: Chat = { id: chatId, type: 'GROUP', name, createdAt: now, updatedAt: now };
  memoryChats.set(chatId, groupChat);
  for (const mId of uniqueMembers) {
    memoryMembers.set(`${chatId}:${mId}`, {
      id: crypto.randomUUID(),
      chatId,
      userId: mId,
      role: mId === creatorId ? 'ADMIN' : 'MEMBER',
    });
  }
  return groupChat;
}

export async function isMember(chatId: string, userId: string): Promise<boolean> {
  if (isDbConnected()) {
    const res = await pool.query(
      `SELECT 1 FROM chat_members WHERE chat_id = $1 AND user_id = $2 LIMIT 1`,
      [chatId, userId]
    );
    return (res.rowCount ?? 0) > 0;
  }
  return memoryMembers.has(`${chatId}:${userId}`);
}

export async function checkChatExists(chatId: string): Promise<void> {
  if (isDbConnected()) {
    const res = await pool.query(`SELECT 1 FROM chats WHERE id = $1 LIMIT 1`, [chatId]);
    if (!res.rowCount) throw new NotFoundError(`Chat '${chatId}' not found`);
  } else {
    if (!memoryChats.has(chatId)) throw new NotFoundError(`Chat '${chatId}' not found`);
  }
}

async function verifyUserExists(userId: string): Promise<void> {
  if (isDbConnected()) {
    const res = await pool.query(`SELECT 1 FROM users WHERE id = $1 LIMIT 1`, [userId]);
    if (!res.rowCount) throw new NotFoundError(`User '${userId}' not found`);
  } else {
    if (!memoryUsers.has(userId)) throw new NotFoundError(`User '${userId}' not found`);
  }
}

export async function getAllUsers() {
  if (isDbConnected()) {
    const res = await pool.query(`SELECT id, name, email FROM users ORDER BY created_at ASC`);
    return res.rows;
  }
  return Array.from(memoryUsers.values());
}

