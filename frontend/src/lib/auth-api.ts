export type User = { id: number; email: string };
export type LoginResult = {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
  expires_at: string;
  user: User;
};

export class AuthError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "AuthError";
  }
}

export async function authRequest<T>(
  path: "login" | "me",
  token?: string,
  credentials?: { email: string; password: string },
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/auth/${path}`, {
      method: credentials ? "POST" : "GET",
      headers: {
        ...(credentials ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(credentials ? { body: JSON.stringify(credentials) } : {}),
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
  } catch {
    throw new AuthError("Connexion au service impossible. Réessayez dans un instant.", 0);
  }
  if (!response.ok) {
    const message = response.status === 401
      ? path === "login"
        ? "Adresse e-mail ou mot de passe incorrect."
        : "Votre session a expiré. Reconnectez-vous."
      : response.status === 422
        ? "Vérifiez votre adresse e-mail et votre mot de passe."
        : "Le service est temporairement indisponible. Réessayez dans un instant.";
    throw new AuthError(message, response.status);
  }
  return response.json() as Promise<T>;
}
