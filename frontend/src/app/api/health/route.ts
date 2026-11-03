export async function GET() {
  const base = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8014";
  try {
    const response = await fetch(`${base}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return Response.json({ status: "unavailable" }, { status: 503 });
    const health = await response.json();
    if (health.status !== "ready" || health.database !== "connected") {
      return Response.json({ status: "unavailable" }, { status: 503 });
    }
    return Response.json(health);
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503 });
  }
}
