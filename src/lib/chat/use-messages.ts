'use client';
import { useEffect, useState } from 'react';
import { db } from '@/lib/db/dexie';
import { Message } from '@/lib/schemas';

export function useMessages(sessionId?: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  useEffect(() => {
    if (!sessionId) { setMessages([]); return; }
    let mounted = true;
    const tick = async () => {
      const ms = await db.messages.where('sessionId').equals(sessionId).sortBy('seq');
      if (mounted) setMessages(ms);
    };
    tick();
    const id = setInterval(tick, 300);
    return () => { mounted = false; clearInterval(id); };
  }, [sessionId]);
  return messages;
}
