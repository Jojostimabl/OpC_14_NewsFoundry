import "server-only";

// URL fixe côté serveur : aucun hôte fourni par le navigateur n'est accepté.
export async function forwardAuth(
  path: "/login" | "/me",
  init: RequestInit,
): Promise<Response> {
  const base = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8014";
  try {
    const upstream = await fetch(`${base}${path}`, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    const data: unknown = await upstream.json();
    return Response.json(data, {
      status: upstream.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json(
      { detail: "Service temporairement indisponible." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
