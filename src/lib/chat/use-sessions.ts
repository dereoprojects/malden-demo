// src/lib/chat/useSessions.ts
"use client";

import { useEffect, useState } from "react";
import { liveQuery } from "dexie";
import { db } from "@/lib/db/dexie";
import { ulid } from "@/lib/ids";
import type { Session } from "@/lib/schemas";

export function useSessions(activeId?: string | null) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [active, setActive] = useState<Session | null>(null);

  // Live list of sessions, newest first
  useEffect(() => {
    const observable = liveQuery(() =>
      db.sessions.orderBy("updatedAt").reverse().toArray()
    );

    const sub = observable.subscribe({
      next: setSessions,
      error: (e) => console.error("useSessions liveQuery error", e),
    });

    return () => sub.unsubscribe();
  }, []);

  // Derive `active` from `activeId` and current list
  useEffect(() => {
    if (!activeId) {
      setActive(null);
      return;
    }
    const found = sessions.find((s) => s.id === activeId) || null;
    setActive(found);
  }, [activeId, sessions]);

  return { sessions, active, setActive };
}

export async function createSession(model: string) {
  const now = Date.now();
  const s: Session = {
    id: ulid(),
    title: "New Chat",
    model,
    createdAt: now,
    updatedAt: now,
  };
  await db.sessions.add(s);
  return s;
}

export async function touchSession(id: string, model?: string) {
  await db.sessions.update(id, {
    updatedAt: Date.now(),
    ...(model ? { model } : {}),
  });
}
