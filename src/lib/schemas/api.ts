import { z } from "zod";

// Chat Stream API
export const ChatStreamRequestSchema = z.object({
  model: z.string().min(1, "Model is required"),
  messages: z.array(z.object({
    role: z.enum(["system", "user", "assistant"]),
    content: z.array(z.discriminatedUnion("type", [
      z.object({
        type: z.literal("text"),
        text: z.string(),
      }),
      z.object({
        type: z.literal("image_url"),
        image_url: z.object({
          url: z.string(),
        }),
      }),
    ])),
  })).min(1, "At least one message is required"),
});

export const ChatStreamEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("delta"),
    delta: z.string(),
  }),
  z.object({
    type: z.literal("completed"),
  }),
  z.object({
    type: z.literal("llm_error"),
    code: z.string(),
    message: z.string(),
    detail: z.any().optional(),
  }),
]);

// Models API
export const PricingSchema = z.object({
  prompt: z.string().optional(),
  completion: z.string().optional(),
  request: z.string().optional(),
  image: z.string().optional(),
  web_search: z.string().optional(),
  input_cache_read: z.string().nullable().optional(),
  input_cache_write: z.string().nullable().optional(),
});

export const ORModelSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  pricing: PricingSchema.optional(),
  architecture: z.object({
    input_modalities: z.array(z.string()).optional(),
  }).optional(),
  canonical_slug: z.string().optional(),
});

export const FreeModelSchema = z.object({
  id: z.string(),
  label: z.string(),
  supportsImages: z.boolean().optional(),
});

export const ModelsResponseSchema = z.object({
  data: z.array(FreeModelSchema),
});

// Error responses
export const ErrorResponseSchema = z.object({
  code: z.string(),
  message: z.string(),
  detail: z.any().optional(),
});

export type ChatStreamRequest = z.infer<typeof ChatStreamRequestSchema>;
export type ChatStreamEvent = z.infer<typeof ChatStreamEventSchema>;
export type Pricing = z.infer<typeof PricingSchema>;
export type ORModel = z.infer<typeof ORModelSchema>;
export type FreeModel = z.infer<typeof FreeModelSchema>;
export type ModelsResponse = z.infer<typeof ModelsResponseSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
