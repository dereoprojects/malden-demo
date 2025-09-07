"use client";

import { useEffect, useState } from "react";
import { liveQuery } from "dexie";
import { db } from "@/lib/db/dexie";
import type { Message } from "@/lib/schemas";

export function useMessages(sessionId?: string) {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (!sessionId) {
      setMessages([]);
      return;
    }

    // Re-runs automatically when matching rows change
    const observable = liveQuery(() =>
      db.messages
        .where("sessionId")
        .equals(sessionId)
        .sortBy("seq") // in-memory sort (kept as you asked)
    );

    const sub = observable.subscribe({
      next: setMessages,
      error: (e) => console.error("useMessages liveQuery error", e),
    });

    return () => sub.unsubscribe();
  }, [sessionId]);

  return messages;
}
