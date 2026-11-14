export type ChatType = 'DIRECT' | 'GROUP';
export type MemberRole = 'MEMBER' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Chat {
  id: string;
  type: ChatType;
  name?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMember {
  id: string;
  chatId: string;
  userId: string;
  role: MemberRole;
  joinedAt: Date;
}

export interface ReadReceipt {
  userId: string;
  readAt: string;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  createdAt: string;
  updatedAt?: string;
  isDeleted?: boolean;
  readBy: ReadReceipt[];
}

export interface LastSeenRecord {
  userId: string;
  messageId: string;
  chatId: string;
  updatedAt: string;
}

export interface UserChatResponse {
  chatId: string;
  type: ChatType;
  name?: string | null;
  memberIds: string[];
  createdAt: string;
}

