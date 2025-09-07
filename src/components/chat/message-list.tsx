"use client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { type Message } from "@/lib/db/dexie";
import { Markdown } from "@/components/common/markdown";
import { useEffect, useRef, useState } from "react";

export function MessageList({ messages }: { messages: Message[] }) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [lastMessageCount, setLastMessageCount] = useState(0);

  useEffect(() => {
    const hasStreamingMessage = messages.some(m => m.status === "streaming");
    const isNewMessage = messages.length > lastMessageCount;

    if (hasStreamingMessage || (isNewMessage && !isUserScrolling)) {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ 
          behavior: "smooth" 
        });
      }
    }
    
    setLastMessageCount(messages.length);
  }, [messages, isUserScrolling, lastMessageCount]);

  useEffect(() => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollArea;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
      setIsUserScrolling(!isAtBottom);
    };

    scrollArea.addEventListener('scroll', handleScroll);
    return () => scrollArea.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <ScrollArea className="px-2 py-4 w-full h-full" ref={scrollAreaRef}>
      <div className="space-y-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={` ${m.role === "user" ? "rounded-md border" : ""} p-3 ${
              m.role === "user" ? "bg-muted/50" : ""
            }`}
          >
            <div className="text-xs opacity-70 mb-1">
              {m.role} · {m.status}
            </div>

            {m.imageDataUrl && (
              <img
                src={m.imageDataUrl}
                alt="uploaded"
                className="max-h-56 rounded mb-2"
              />
            )}

            <Markdown
              content={m.content ?? m.contentDraft ?? ""}
              isStreaming={m.status === "streaming"}
            />

            {m.status === "error" && (
              <div className="mt-2 text-xs text-red-600">
                {m.errorMessage ?? "Error"}
                {m.errorCode ? ` (${m.errorCode})` : null}
              </div>
            )}
            {m.status === "stopped" && (
              <div className="mt-2 text-xs text-amber-600">Stopped by user</div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
}
