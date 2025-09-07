'use client';
import Dexie, { Table } from 'dexie';
import { Session, Message } from '@/lib/schemas';

class ChatDB extends Dexie {
  sessions!: Table<Session, string>;
  messages!: Table<Message, string>;
  constructor() {
    super('madlenChatDB');
    this.version(1).stores({
      sessions: 'id, updatedAt',
      messages: 'id, sessionId, seq, updatedAt'
    });
  }
}
export const db = new ChatDB();
