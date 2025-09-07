// src/lib/chat/useStreamTurn.ts
"use client";

import { useRef } from "react";
import { toast } from "sonner";
import { db } from "@/lib/db/dexie";
import { ulid } from "@/lib/ids";
import { ORContentPart, StreamTurnOptions } from "@/lib/schemas";

function toastFromCode(code?: string, fallback = "LLM error") {
  switch (code) {
    case "missing_key":
    case "401":
      return toast.error(
        "Missing/invalid API key. Set OPENROUTER_API_KEY in your .env file"
      );
    case "402":
      return toast.error("Payment required: no credit for this model/account.");
    case "rate_limited":
    case "429":
      return toast.warning("Rate limited. Try again soon or switch model.");
    case "model_not_found":
    case "404":
      return toast.error("Model not found/unavailable. Pick another.");
    case "upstream_5xx":
      return toast.error("Provider issue (5xx). Please retry.");
    case "aborted":
      return toast.message("Generation stopped.");
    case "network":
      return toast.error("Network error. Check your connection.");
    default:
      return toast.error(fallback);
  }
}

export function useStreamTurn() {
  const abortRef = useRef<AbortController | null>(null);
  const currentAssistantIdRef = useRef<string | null>(null);

  async function start(opts: StreamTurnOptions) {
    const { sessionId, model, userText, imageDataUrl } = opts;
    const now = Date.now();

    // next sequence
    const countBefore = await db.messages
      .where("sessionId")
      .equals(sessionId)
      .count();
    const seqBase = countBefore + 1;

    // 1) persist user message
    const userMsgId = ulid();
    await db.messages.add({
      id: userMsgId,
      sessionId,
      role: "user",
      seq: seqBase,
      status: "completed",
      content: userText,
      imageDataUrl,
      createdAt: now,
      updatedAt: now,
    });

    // 2) assistant placeholder (for UI only)
    const assistantId = ulid();
    currentAssistantIdRef.current = assistantId;
    await db.messages.add({
      id: assistantId,
      sessionId,
      role: "assistant",
      seq: seqBase + 1,
      status: "streaming",
      contentDraft: "",
      createdAt: now,
      updatedAt: now,
    });

    // 3) auto-title if first exchange
    const totalAfter = await db.messages
      .where("sessionId")
      .equals(sessionId)
      .count();
    if (totalAfter <= 2) {
      const sess = await db.sessions.get(sessionId);
      if (sess && (sess.title === "New Chat" || !sess.title)) {
        const candidate = userText.trim().replace(/\s+/g, " ").slice(0, 60);
        if (candidate) await db.sessions.update(sessionId, { title: candidate });
      }
    }

    // 4) Build LLM payload from FULL history,
    //    but ❗ exclude the streaming assistant placeholder we just created.
    const all = await db.messages.where("sessionId").equals(sessionId).sortBy("seq");
    const forLlm = all.filter((m) => m.id !== assistantId);

    // last *user* index within the filtered list (for image inclusion rule)
    const lastUserIndex = (() => {
      for (let i = forLlm.length - 1; i >= 0; i--) {
        if (forLlm[i].role === "user") return i;
      }
      return -1;
    })();

    const toParts = (m: (typeof forLlm)[number], idx: number): ORContentPart[] => {
      const parts: ORContentPart[] = [];
      if (m.content) parts.push({ type: "text", text: m.content });
      // include image ONLY if it's on the last user message
      if (m.imageDataUrl && idx === lastUserIndex) {
        parts.push({ type: "image_url", image_url: { url: m.imageDataUrl } });
      }
      return parts.length ? parts : [{ type: "text", text: "" }];
    };

    const payloadMessages = forLlm.map((m, i) => ({
      role: m.role,
      content: toParts(m, i),
    }));

    // 5) POST stream (NDJSON)
    const ac = new AbortController();
    abortRef.current = ac;

    let res: Response;
    try {
      res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages: payloadMessages }),
        signal: ac.signal,
      });
    } catch (e: unknown) {
      await db.messages.update(assistantId, {
        status: "error",
        errorCode: "network",
        errorMessage: e instanceof Error ? e.message : "Network error.",
        updatedAt: Date.now(),
      });
      toastFromCode("network");
      currentAssistantIdRef.current = null;
      abortRef.current = null;
      return null;
    }

    if (!res.ok || !res.body) {
      let code = String(res.status);
      let message = `Failed to start (${res.status})`;
      try {
        const j = await res.json();
        code = j?.code || code;
        message = j?.message || message;
      } catch {}
      await db.messages.update(assistantId, {
        status: "error",
        errorCode: code,
        errorMessage: message,
        updatedAt: Date.now(),
      });
      toastFromCode(code, message);
      currentAssistantIdRef.current = null;
      abortRef.current = null;
      return null;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let partial = "";
    let flushTimer: NodeJS.Timeout | null = null;

    const flush = async () => {
      if (flushTimer) clearTimeout(flushTimer);
      flushTimer = setTimeout(async () => {
        await db.messages.update(assistantId, {
          contentDraft: buf,
          updatedAt: Date.now(),
        });
      }, 250);
    };

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
            flush();
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
            await db.messages.update(assistantId, {
              status: "error",
              errorCode: code,
              errorMessage: message,
              updatedAt: Date.now(),
            });
            toastFromCode(code, message);
            abortRef.current = null;
            currentAssistantIdRef.current = null;
            return null;
          }
        } catch {
          /* ignore malformed line */
        }
      }
    }

    await db.messages.update(assistantId, {
      status: "error",
      errorCode: "stream_error",
      errorMessage: "Streaming connection error",
      updatedAt: Date.now(),
    });
    toast.error("Streaming connection error");
    abortRef.current = null;
    currentAssistantIdRef.current = null;
    return null;
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
