import { forwardAuth } from "@/lib/auth-proxy";

export async function GET(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization || authorization.length > 4096) {
    return Response.json(
      { detail: "Authentification requise." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }
  return forwardAuth("/me", { headers: { Authorization: authorization } });
}
