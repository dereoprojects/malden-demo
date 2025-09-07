import { z } from "zod";

export const RoleSchema = z.enum(["system", "user", "assistant"]);
export const MsgStatusSchema = z.enum(["queued", "streaming", "completed", "error", "stopped"]);

export const SessionSchema = z.object({
  id: z.string(),
  title: z.string(),
  model: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  summary: z.string().optional(),
});

export const MessageSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  role: RoleSchema,
  seq: z.number(),
  status: MsgStatusSchema,
  content: z.string().optional(),
  contentDraft: z.string().optional(),
  imageDataUrl: z.string().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
});

export type Role = z.infer<typeof RoleSchema>;
export type MsgStatus = z.infer<typeof MsgStatusSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type Message = z.infer<typeof MessageSchema>;
