import { forwardAuth } from "@/lib/auth-proxy";

export async function POST(request: Request) {
  let credentials: unknown;
  try {
    credentials = await request.json();
  } catch {
    return Response.json({ detail: "Formulaire invalide." }, { status: 422 });
  }
  if (
    typeof credentials !== "object" || credentials === null ||
    !("email" in credentials) || typeof credentials.email !== "string" ||
    !("password" in credentials) || typeof credentials.password !== "string" ||
    credentials.email.length > 254 || credentials.password.length > 256
  ) {
    return Response.json({ detail: "Formulaire invalide." }, { status: 422 });
  }
  return forwardAuth("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: credentials.email, password: credentials.password }),
  });
}
