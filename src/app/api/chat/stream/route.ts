import { NextRequest } from "next/server";
import {
  buildOpenRouterReq,
  openRouterHeaders,
  parseORFailure,
} from "@/lib/llm/openrouter";
import { trace } from "@opentelemetry/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { model, messages } = await req.json();

  try {
    const span = trace.getActiveSpan();
    if (span) {
      const lastTextContent =
        Array.isArray(messages) && messages.length > 0
          ? messages[messages.length - 1].content
          : null;

      var lastText =
        lastTextContent.find((item: any) => item.type === "text")?.text ||
        "N/A";
      var lastImage = lastTextContent.find((item: any) => item.type === "image_url")
        ? "true"
        : "false";
      if (lastText.length > 512) lastText = lastText.slice(0, 509) + "...";

      span.setAttribute("chat.model", String(model ?? ""));
      span.setAttribute("chat.last_message.text.content", lastText);
      span.setAttribute("chat.last_message.has_image", lastImage);
    }
  } catch {
  }

  if (!process.env.OPENROUTER_API_KEY) {
    return new Response(
      JSON.stringify({
        code: "missing_key",
        message: "OPENROUTER_API_KEY is not set on the server.",
      }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }
  if (!model || !Array.isArray(messages) || messages.length === 0) {
    return new Response(
      JSON.stringify({
        code: "bad_request",
        message: "model and messages are required.",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: any) => {
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      };

      try {
        const upstream = await fetch(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            method: "POST",
            headers: openRouterHeaders(),
            body: JSON.stringify(buildOpenRouterReq(model, messages)),
            cache: "no-store",
            signal: req.signal,
          }
        );

        if (!upstream.ok || !upstream.body) {
          const { code, message, detail } = await parseORFailure(upstream);
          send({ type: "llm_error", code, message, detail });
          controller.close();
          return;
        }

        const reader = upstream.body.getReader();
        const dec = new TextDecoder();

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = dec.decode(value);

          for (const line of chunk.split("\n")) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const payload = trimmed.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;

            try {
              const j = JSON.parse(payload);

              if (j?.error) {
                const code = j.error.code?.toString?.() || "stream_error";
                const message =
                  j.error.message || "Provider error during stream.";
                send({ type: "llm_error", code, message, detail: j.error });
                controller.close();
                return;
              }

              const delta: string =
                j?.choices?.[0]?.delta?.content ??
                j?.choices?.[0]?.message?.content ??
                "";
              if (delta) send({ type: "delta", delta });
            } catch {
              /* ignore keepalives */
            }
          }
        }

        send({ type: "completed" });
        controller.close();
      } catch (err: any) {
        if (req.signal.aborted) {
          send({
            type: "llm_error",
            code: "aborted",
            message: "Request was aborted.",
          });
        } else {
          send({
            type: "llm_error",
            code: "network",
            message: err?.message || "Network error.",
          });
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
