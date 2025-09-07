import { z } from "zod";
import { Session } from "./database";

export const StreamTurnOptionsSchema = z.object({
  sessionId: z.string(),
  model: z.string(),
  userText: z.string(),
  imageDataUrl: z.string().optional(),
});

export const FreeModelItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  supportsImages: z.boolean().optional(),
});

export const ModelSelectItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  supportsImages: z.boolean().optional(),
});

export const ComposerPropsSchema = z.object({
  isStreaming: z.boolean().optional().default(false),
  isImageSupported: z.boolean().optional().default(false),
});

export const SessionListPropsSchema = z.object({
  sessions: z.array(z.object({
    id: z.string(),
    title: z.string(),
    model: z.string(),
    createdAt: z.number(),
    updatedAt: z.number(),
    summary: z.string().optional(),
  })),
  activeId: z.string().nullable().optional(),
});

export const MessageListPropsSchema = z.object({
  messages: z.array(z.object({
    id: z.string(),
    sessionId: z.string(),
    role: z.enum(["system", "user", "assistant"]),
    seq: z.number(),
    status: z.enum(["queued", "streaming", "completed", "error", "stopped"]),
    content: z.string().optional(),
    contentDraft: z.string().optional(),
    imageDataUrl: z.string().optional(),
    createdAt: z.number(),
    updatedAt: z.number(),
    errorCode: z.string().optional(),
    errorMessage: z.string().optional(),
  })),
});

export const MarkdownPropsSchema = z.object({
  content: z.string(),
  isStreaming: z.boolean().optional().default(false),
});

export type StreamTurnOptions = z.infer<typeof StreamTurnOptionsSchema>;
export type FreeModelItem = z.infer<typeof FreeModelItemSchema>;
export type ModelSelectItem = z.infer<typeof ModelSelectItemSchema>;

export type ComposerProps = z.infer<typeof ComposerPropsSchema> & {
  onSend: (text: string, imageDataUrl?: string) => Promise<void> | void;
  onStop?: () => Promise<void> | void;
};

export type SessionListProps = z.infer<typeof SessionListPropsSchema> & {
  onNew?: () => void;
  onPick: (session: Session | 'new') => void;
};

export type MessageListProps = z.infer<typeof MessageListPropsSchema>;

export type MarkdownProps = z.infer<typeof MarkdownPropsSchema>;
