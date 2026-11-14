import { pool, testConnection } from '../config/db';
import { runMigrations } from './migrate';
import { getFirestore } from '../config/firebase';

export const SEED_USERS = [
  { id: 'usr_veerendra', name: 'Veerendra Raghuwanshi', email: 'veerendra@bespokeaistylist.com' },
  { id: 'usr_aayushi', name: 'Aayushi Sharma', email: 'aayushi@codesfortomorrow.com' },
  { id: 'usr_rahul', name: 'Rahul Verma', email: 'rahul.verma@example.com' },
  { id: 'usr_sneha', name: 'Sneha Patel', email: 'sneha.patel@example.com' },
  { id: 'usr_alex', name: 'Alex Mercer', email: 'alex.mercer@example.com' },
];

// Fallback memory state for offline testing
export const memoryUsers = new Map<string, any>();
export const memoryChats = new Map<string, any>();
export const memoryMembers = new Map<string, any>();

export async function seed() {
  console.log('[seed] Seeding database...');

  const connected = await testConnection();
  if (connected) {
    await runMigrations();

    for (const u of SEED_USERS) {
      await pool.query(
        `INSERT INTO users (id, name, email) VALUES ($1, $2, $3)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email`,
        [u.id, u.name, u.email]
      );
    }

    // Seed sample 1:1 chat
    const chatId = 'chat_veerendra_aayushi';
    await pool.query(
      `INSERT INTO chats (id, type) VALUES ($1, 'DIRECT') ON CONFLICT (id) DO NOTHING`,
      [chatId]
    );

    await pool.query(
      `INSERT INTO chat_members (id, chat_id, user_id, role)
       VALUES ('m1', $1, 'usr_veerendra', 'MEMBER'), ('m2', $1, 'usr_aayushi', 'MEMBER')
       ON CONFLICT (chat_id, user_id) DO NOTHING`,
      [chatId]
    );
  } else {
    // Memory fallback
    for (const u of SEED_USERS) {
      memoryUsers.set(u.id, { ...u, createdAt: new Date(), updatedAt: new Date() });
    }
    const chatId = 'chat_veerendra_aayushi';
    memoryChats.set(chatId, { id: chatId, type: 'DIRECT', createdAt: new Date(), updatedAt: new Date() });
    memoryMembers.set(`${chatId}:usr_veerendra`, { id: 'm1', chatId, userId: 'usr_veerendra', role: 'MEMBER' });
    memoryMembers.set(`${chatId}:usr_aayushi`, { id: 'm2', chatId, userId: 'usr_aayushi', role: 'MEMBER' });
  }

  // Seed sample message in Firestore
  const db = getFirestore();
  const sampleMsgId = 'msg_init_1';
  await db.collection('chats').doc('chat_veerendra_aayushi').collection('messages').doc(sampleMsgId).set({
    id: sampleMsgId,
    chatId: 'chat_veerendra_aayushi',
    senderId: 'usr_aayushi',
    text: 'Hello Veerendra, welcome to the Codes For Tomorrow chat assessment!',
    createdAt: new Date().toISOString(),
    isDeleted: false,
    readBy: [{ userId: 'usr_veerendra', readAt: new Date().toISOString() }],
  });

  await db.collection('chats').doc('chat_veerendra_aayushi').collection('lastSeen').doc('usr_aayushi').set({
    userId: 'usr_aayushi',
    messageId: sampleMsgId,
    chatId: 'chat_veerendra_aayushi',
    updatedAt: new Date().toISOString(),
  });

  console.log('[seed] Seeding completed');
}

if (require.main === module) {
  seed()
    .then(() => pool.end())
    .catch((err) => {
      console.error('[seed] Error:', err);
      process.exit(1);
    });
}
