// src/lib/chat/useStreamTurn.ts
"use client";

import { useRef } from "react";
import { toast } from "sonner";
import { db } from "@/lib/db/dexie";
import { ulid } from "@/lib/ids";
import type { ORContentPart, StreamTurnOptions } from "@/lib/schemas";

function toastFromCode(code?: string, fallback = "LLM error") {
  switch (code) {
    case "missing_key":
    case "401": return toast.error("Missing/invalid API key. Set OPENROUTER_API_KEY in your .env file");
    case "402": return toast.error("Payment required: no credit for this model/account.");
    case "rate_limited":
    case "429": return toast.warning("Rate limited. Try again soon or switch model.");
    case "model_not_found":
    case "404": return toast.error("Model not found/unavailable. Pick another.");
    case "upstream_5xx": return toast.error("Provider issue (5xx). Please retry.");
    case "aborted": return toast.message("Generation stopped.");
    case "network": return toast.error("Network error. Check your connection.");
    default: return toast.error(fallback);
  }
}

export function useStreamTurn() {
  const abortRef = useRef<AbortController | null>(null);
  const currentAssistantIdRef = useRef<string | null>(null);

  async function start(opts: StreamTurnOptions) {
    // Prevent double-send while a stream is active
    if (abortRef.current) {
      toast.message("Already generating. Stop or wait to send another message.");
      return null;
    }

    const { sessionId, model, userText, imageDataUrl } = opts;
    const now = Date.now();

    // Create user + placeholder assistant inside a transaction to avoid seq races
    let assistantId = ulid();
    await db.transaction("rw", db.messages, db.sessions, async () => {
      const countBefore = await db.messages.where("sessionId").equals(sessionId).count();
      const userSeq = countBefore + 1;

      await db.messages.add({
        id: ulid(),
        sessionId,
        role: "user",
        seq: userSeq,
        status: "completed",
        content: userText,
        imageDataUrl,
        createdAt: now,
        updatedAt: now,
      });

      // assistant placeholder (for UI only)
      assistantId = ulid();
      await db.messages.add({
        id: assistantId,
        sessionId,
        role: "assistant",
        seq: userSeq + 1,
        status: "streaming",
        contentDraft: "",
        createdAt: now,
        updatedAt: now,
      });

      // auto-title if first exchange
      const totalAfter = await db.messages.where("sessionId").equals(sessionId).count();
      if (totalAfter <= 2) {
        const sess = await db.sessions.get(sessionId);
        if (sess && (sess.title === "New Chat" || !sess.title)) {
          const candidate = userText.trim().replace(/\s+/g, " ").slice(0, 60);
          if (candidate) await db.sessions.update(sessionId, { title: candidate });
        }
      }
    });

    currentAssistantIdRef.current = assistantId;

    // Build payload from FULL history, excluding the placeholder
    const all = await db.messages.where("sessionId").equals(sessionId).sortBy("seq");
    const forLlm = all.filter((m) => m.id !== assistantId);

    const lastUserIndex = (() => {
      for (let i = forLlm.length - 1; i >= 0; i--) if (forLlm[i].role === "user") return i;
      return -1;
    })();

    const toParts = (m: (typeof forLlm)[number], idx: number): ORContentPart[] => {
      const parts: ORContentPart[] = [];
      if (m.content) parts.push({ type: "text", text: m.content });
      if (m.imageDataUrl && idx === lastUserIndex) {
        parts.push({ type: "image_url", image_url: { url: m.imageDataUrl } });
      }
      return parts.length ? parts : [{ type: "text", text: "" }];
    };

    const payloadMessages = forLlm.map((m, i) => ({
      role: m.role,
      content: toParts(m, i),
    }));

    // Stream (NDJSON)
    const ac = new AbortController();
    abortRef.current = ac;

    const fail = async (code: string, message: string) => {
      // One place to finalize error state + refs + toast
      try {
        await db.messages.update(assistantId, {
          status: "error",
          errorCode: code,
          errorMessage: message,
          updatedAt: Date.now(),
        });
      } finally {
        toastFromCode(code, message);
        abortRef.current = null;
        currentAssistantIdRef.current = null;
      }
      return null;
    };

    let res: Response;
    try {
      res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages: payloadMessages }),
        signal: ac.signal,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Network error.";
      return await fail("network", msg);
    }

    if (!res.ok || !res.body) {
      let code = String(res.status);
      let message = `Failed to start (${res.status})`;
      try {
        const j = await res.json();
        code = j?.code || code;
        message = j?.message || message;
      } catch {}
      return await fail(code, message);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let partial = "";
    let flushTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleFlush = () => {
      if (flushTimer) clearTimeout(flushTimer);
      // fire-and-forget to keep the loop responsive
      flushTimer = setTimeout(() => {
        void db.messages.update(assistantId, {
          contentDraft: buf,
          updatedAt: Date.now(),
        });
      }, 200);
    };

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        partial += decoder.decode(value, { stream: true });
        const lines = partial.split("\n");
        partial = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const evt = JSON.parse(line);
            if (evt.type === "delta" && typeof evt.delta === "string") {
              buf += evt.delta;
              scheduleFlush();
            } else if (evt.type === "completed") {
              await db.messages.update(assistantId, {
                content: buf,
                contentDraft: undefined,
                status: "completed",
                updatedAt: Date.now(),
              });
              abortRef.current = null;
              currentAssistantIdRef.current = null;
              return assistantId;
            } else if (evt.type === "llm_error") {
              const code = evt.code || "stream_error";
              const message = evt.message || "Streaming error";
              return await fail(code, message);
            }
          } catch {
            // ignore malformed lines / keepalives
          }
        }
      }

      // Ended without "completed"
      return await fail("stream_error", "Streaming connection error");
    } finally {
      if (flushTimer) clearTimeout(flushTimer);
      // ensure refs are cleared even on exceptional exits
      abortRef.current = null;
      // currentAssistantIdRef is already cleared in success/error paths; keep if streaming didn’t finalize
    }
  }

  async function stop() {
    const ac = abortRef.current;
    const assistantId = currentAssistantIdRef.current;
    if (!ac || !assistantId) return;

    ac.abort();
    abortRef.current = null;

    await db.messages.update(assistantId, {
      status: "stopped",
      errorCode: "aborted",
      errorMessage: "Stopped by user",
      updatedAt: Date.now(),
    });

    currentAssistantIdRef.current = null;
    toast.message("Generation stopped");
  }

  return { start, stop };
}
