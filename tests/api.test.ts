import request from 'supertest';
import { createApp } from '../src/app';
import { seed } from '../src/db/seed';

describe('Chat Backend Integration Tests', () => {
  const app = createApp();

  beforeAll(async () => {
    await seed();
  });

  describe('1. POST /chat/create', () => {
    it('creates a new direct chat between two users', async () => {
      const res = await request(app)
        .post('/chat/create')
        .send({ userAId: 'usr_rahul', userBId: 'usr_sneha' });

      expect(res.status).toBe(201);
      expect(res.body.chatId).toBeDefined();
      expect(res.body.isNew).toBe(true);
    });

    it('returns existing chatId if direct chat already exists', async () => {
      const first = await request(app)
        .post('/chat/create')
        .send({ userAId: 'usr_rahul', userBId: 'usr_sneha' });

      const second = await request(app)
        .post('/chat/create')
        .send({ userAId: 'usr_sneha', userBId: 'usr_rahul' });

      expect(second.status).toBe(200);
      expect(second.body.chatId).toBe(first.body.chatId);
      expect(second.body.isNew).toBe(false);
    });

    it('fails when user attempts chat with themselves', async () => {
      const res = await request(app)
        .post('/chat/create')
        .send({ userAId: 'usr_veerendra', userBId: 'usr_veerendra' });

      expect(res.status).toBe(400);
    });

    it('returns 404 if a user does not exist', async () => {
      const res = await request(app)
        .post('/chat/create')
        .send({ userAId: 'usr_veerendra', userBId: 'user_unknown_404' });

      expect(res.status).toBe(404);
    });
  });

  describe('2. POST /chat/:chatId/message/send', () => {
    let chatId: string;

    beforeAll(async () => {
      const r = await request(app)
        .post('/chat/create')
        .send({ userAId: 'usr_veerendra', userBId: 'usr_alex' });
      chatId = r.body.chatId;
    });

    it('sends message and stores in firestore with timestamp', async () => {
      const res = await request(app)
        .post(`/chat/${chatId}/message/send`)
        .send({ senderId: 'usr_veerendra', text: 'Hey Alex, how is the task coming along?' });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.chatId).toBe(chatId);
      expect(res.body.senderId).toBe('usr_veerendra');
      expect(res.body.text).toBe('Hey Alex, how is the task coming along?');
      expect(res.body.createdAt).toBeDefined();
    });

    it('blocks non-members from sending message', async () => {
      const res = await request(app)
        .post(`/chat/${chatId}/message/send`)
        .send({ senderId: 'usr_sneha', text: 'Uninvited message' });

      expect(res.status).toBe(403);
    });
  });

  describe('3. GET /chat/:chatId/messages', () => {
    let chatId: string;

    beforeAll(async () => {
      const r = await request(app)
        .post('/chat/create')
        .send({ userAId: 'usr_alex', userBId: 'usr_sneha' });
      chatId = r.body.chatId;

      await request(app).post(`/chat/${chatId}/message/send`).send({ senderId: 'usr_alex', text: 'Msg 1' });
      await request(app).post(`/chat/${chatId}/message/send`).send({ senderId: 'usr_sneha', text: 'Msg 2' });
    });

    it('returns messages ordered by timestamp', async () => {
      const res = await request(app).get(`/chat/${chatId}/messages?limit=10`);

      expect(res.status).toBe(200);
      expect(res.body.messages.length).toBe(2);
      expect(res.body.messages[0].text).toBe('Msg 1');
      expect(res.body.messages[1].text).toBe('Msg 2');
    });
  });

  describe('4. POST /chat/:chatId/message/:messageId/read', () => {
    let chatId: string;
    let messageId: string;

    beforeAll(async () => {
      const r = await request(app)
        .post('/chat/create')
        .send({ userAId: 'usr_veerendra', userBId: 'usr_rahul' });
      chatId = r.body.chatId;

      const m = await request(app)
        .post(`/chat/${chatId}/message/send`)
        .send({ senderId: 'usr_veerendra', text: 'Important update' });
      messageId = m.body.id;
    });

    it('marks message as read in firestore', async () => {
      const res = await request(app)
        .post(`/chat/${chatId}/message/${messageId}/read`)
        .send({ userId: 'usr_rahul' });

      expect(res.status).toBe(200);
      expect(res.body.userId).toBe('usr_rahul');
      expect(res.body.readAt).toBeDefined();

      const msgs = await request(app).get(`/chat/${chatId}/messages`);
      const target = msgs.body.messages.find((x: any) => x.id === messageId);
      expect(target.readBy.some((rb: any) => rb.userId === 'usr_rahul')).toBe(true);
    });
  });

  describe('5. POST /chat/:chatId/lastseen', () => {
    it('updates last seen message pointer in firestore', async () => {
      const res = await request(app)
        .post('/chat/chat_veerendra_aayushi/lastseen')
        .send({ userId: 'usr_aayushi', messageId: 'msg_init_1' });

      expect(res.status).toBe(200);
      expect(res.body.userId).toBe('usr_aayushi');
      expect(res.body.messageId).toBe('msg_init_1');
    });
  });

  describe('6. GET /user/:userId/chats', () => {
    it('lists all chats with member IDs for a user', async () => {
      const res = await request(app).get('/user/usr_veerendra/chats');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.chats)).toBe(true);
      expect(res.body.chats.length).toBeGreaterThan(0);
      expect(res.body.chats[0].memberIds).toContain('usr_veerendra');
    });
  });

  describe('Bonus: Group Chats & Message Edit/Delete', () => {
    let groupId: string;
    let messageId: string;

    it('creates a group chat', async () => {
      const res = await request(app)
        .post('/chat/group/create')
        .send({
          creatorId: 'usr_veerendra',
          name: 'Codes For Tomorrow Engineering',
          memberIds: ['usr_aayushi', 'usr_rahul'],
        });

      expect(res.status).toBe(201);
      expect(res.body.type).toBe('GROUP');
      groupId = res.body.id;
    });

    it('edits a message', async () => {
      const sent = await request(app)
        .post(`/chat/${groupId}/message/send`)
        .send({ senderId: 'usr_veerendra', text: 'Original message' });
      messageId = sent.body.id;

      const editRes = await request(app)
        .patch(`/chat/${groupId}/message/${messageId}`)
        .send({ senderId: 'usr_veerendra', text: 'Edited message' });

      expect(editRes.status).toBe(200);
      expect(editRes.body.text).toBe('Edited message');
    });

    it('soft deletes a message', async () => {
      const delRes = await request(app)
        .delete(`/chat/${groupId}/message/${messageId}`)
        .send({ senderId: 'usr_veerendra' });

      expect(delRes.status).toBe(200);

      const msgs = await request(app).get(`/chat/${groupId}/messages`);
      const deleted = msgs.body.messages.find((m: any) => m.id === messageId);
      expect(deleted.isDeleted).toBe(true);
      expect(deleted.text).toBe('This message was deleted');
    });
  });
});
