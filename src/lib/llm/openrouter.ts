export type ORTextPart = { type: "text"; text: string };
export type ORImagePart = { type: "image_url"; image_url: { url: string } };
export type ORContentPart = ORTextPart | ORImagePart;

export type ORMsg = {
  role: "system" | "user" | "assistant";
  content: ORContentPart[];
};

export function buildOpenRouterReq(model: string, messages: ORMsg[]) {
  return {
    model,
    messages,
    stream: true,
  };
}

export const openRouterHeaders = () => ({
  Authorization: `Bearer ${process.env.OPENROUTER_API_KEY ?? ""}`,
  "Content-Type": "application/json",
  "HTTP-Referer": process.env.APP_BASE_URL ?? "http://localhost:3000",
  "X-Title": process.env.APP_TITLE ?? "Madlen Chat",
});

export async function parseORFailure(res: Response) {
  let detail: any = null;
  try {
    detail = await res.json();
  } catch {
    try {
      detail = { message: await res.text() };
    } catch {
      /* ignore */
    }
  }

  const status = res.status;
  const rawMsg =
    detail?.error?.message ??
    detail?.message ??
    `OpenRouter error (${status})`;

  let code = String(status);
  let message = rawMsg;

  if (status === 401) {
    code = "401";
    message = "Unauthorized: missing or invalid OpenRouter API key.";
  } else if (status === 402) {
    code = "402";
    message =
      "Payment required: your OpenRouter account has no credit for this model.";
  } else if (status === 404) {
    code = "model_not_found";
    message = "Model not found or unavailable. Pick another model.";
  } else if (status === 429) {
    code = "rate_limited";
    message =
      "Rate limited by provider. Please wait a bit or try a free/less busy model.";
  } else if (status >= 500) {
    code = "upstream_5xx";
    message = "Provider is having an issue. Please retry shortly.";
  }

  return { code, message, detail };
}