import { z } from "zod";

export const ORTextPartSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
});

export const ORImagePartSchema = z.object({
  type: z.literal("image_url"),
  image_url: z.object({
    url: z.string(),
  }),
});

export const ORContentPartSchema = z.discriminatedUnion("type", [
  ORTextPartSchema,
  ORImagePartSchema,
]);

export const ORMsgSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.array(ORContentPartSchema),
});

export const OpenRouterRequestSchema = z.object({
  model: z.string(),
  messages: z.array(ORMsgSchema),
  stream: z.literal(true),
});

export const OpenRouterResponseSchema = z.object({
  choices: z.array(z.object({
    delta: z.object({
      content: z.string().optional(),
    }).optional(),
    message: z.object({
      content: z.string().optional(),
    }).optional(),
  })),
  error: z.object({
    message: z.string(),
    code: z.string().optional(),
    type: z.string().optional(),
  }).optional(),
});

export type ORTextPart = z.infer<typeof ORTextPartSchema>;
export type ORImagePart = z.infer<typeof ORImagePartSchema>;
export type ORContentPart = z.infer<typeof ORContentPartSchema>;
export type ORMsg = z.infer<typeof ORMsgSchema>;
export type OpenRouterRequest = z.infer<typeof OpenRouterRequestSchema>;
export type OpenRouterResponse = z.infer<typeof OpenRouterResponseSchema>;
