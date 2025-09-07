import { NextRequest } from "next/server";

type Pricing = Partial<{
  prompt: string;
  completion: string;
  request: string;
  image: string;
  web_search: string;
  input_cache_read?: string | null;
  input_cache_write?: string | null;
}>;

type ORModel = {
  id: string;
  name?: string;
  pricing?: Pricing;
  architecture?: {
    input_modalities?: string[];
  };
  canonical_slug?: string;
};

function isFreeModel(m: ORModel) {
  const p = m.pricing || {};
  const bySuffix = /:free$/i.test(m.id);
  const byToken =
    p.prompt === "0" &&
    p.completion === "0" &&
    p.request === "0" &&
    p.image === "0";
  return Boolean(bySuffix || byToken);
}

export async function GET(_req: NextRequest) {
  const res = await fetch("https://openrouter.ai/api/v1/models", {
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY ?? ""}`,
      "Content-Type": "application/json",
    },
    next: { revalidate: 60 * 15 },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return new Response(
      JSON.stringify({
        error: "failed_models_list",
        status: res.status,
        detail: text,
      }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  const json = await res.json();
  const models: ORModel[] = Array.isArray(json?.data) ? json.data : [];

  const free = models
    .filter(isFreeModel)
    .map((m) => {
      const modalities: string[] = m?.architecture?.input_modalities ?? [];
      const supportsImages = modalities.includes("image");

      return {
        id: m.id,
        label: m.name || m.canonical_slug || m.id,
        supportsImages,
      };
    })
    .filter((m, i, a) => a.findIndex((x) => x.id === m.id) === i)
    .sort((a, b) => a.label.localeCompare(b.label));

  return Response.json({ data: free });
}
