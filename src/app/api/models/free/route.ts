import { NextRequest } from "next/server";
import { ORModelSchema, ModelsResponseSchema, ErrorResponseSchema, ORModel, FreeModel } from "@/lib/schemas";

function isFreeModel(m: ORModel): boolean {
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
      JSON.stringify(ErrorResponseSchema.parse({
        code: "failed_models_list",
        message: `Failed to fetch models: ${res.status}`,
        detail: text,
      })),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  const json = await res.json();
  const models: ORModel[] = Array.isArray(json?.data) 
    ? json.data.map((m: unknown) => ORModelSchema.parse(m)) 
    : [];

  const free: FreeModel[] = models
    .filter(isFreeModel)
    .map((m: ORModel): FreeModel => {
      const modalities: string[] = m?.architecture?.input_modalities ?? [];
      const supportsImages = modalities.includes("image");

      return {
        id: m.id,
        label: m.name || m.canonical_slug || m.id,
        supportsImages,
      };
    })
    .filter((m: FreeModel, i: number, a: FreeModel[]) => 
      a.findIndex((x: FreeModel) => x.id === m.id) === i
    )
    .sort((a: FreeModel, b: FreeModel) => a.label.localeCompare(b.label));

  return Response.json(ModelsResponseSchema.parse({ data: free }));
}
