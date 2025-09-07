'use client';
import { useEffect, useState } from 'react';
import { db } from '@/lib/db/dexie';
import { Session } from '@/lib/schemas';

export function useSessions(activeId?: string | null) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [active, setActive] = useState<Session | null>(null);

  useEffect(() => {
    let mounted = true;
    const tick = async () => {
      const ss = await db.sessions.orderBy('updatedAt').reverse().toArray();
      if (!mounted) return;
      setSessions(ss);
      if (activeId && !active) {
        const found = ss.find(s => s.id === activeId);
        if (found) {
          setActive(found);
        }
      }
    };
    tick();
    const id = setInterval(tick, 300);
    return () => { mounted = false; clearInterval(id); };
  }, [activeId, active]);

  return { sessions, active, setActive };
}

export async function createSession(model: string) {
  const now = Date.now();
  const s: Session = {
    id: (await import('@/lib/ids')).ulid(),
    title: 'New Chat',
    model,
    createdAt: now,
    updatedAt: now
  };
  await db.sessions.add(s);
  return s;
}

export async function touchSession(id: string, model?: string) {
  await db.sessions.update(id, { updatedAt: Date.now(), ...(model ? { model } : {}) });
}
