export async function GET() {
  const res = await fetch("https://example.com", { cache: "no-store" });
  return Response.json({ ok: res.ok });
}
