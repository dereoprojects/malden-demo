'use client';
import Dexie, { Table } from 'dexie';

export type Role = 'system' | 'user' | 'assistant';
export type MsgStatus = 'queued' | 'streaming' | 'completed' | 'error' | 'stopped';

export interface Session {
  id: string;
  title: string;
  model: string;
  createdAt: number;
  updatedAt: number;
  summary?: string;
}

export interface Message {
  id: string;
  sessionId: string;
  role: Role;
  seq: number;
  status: MsgStatus;
  content?: string;
  contentDraft?: string;
  imageDataUrl?: string;
  createdAt: number;
  updatedAt: number;
  errorCode?: string;
  errorMessage?: string;
}

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
