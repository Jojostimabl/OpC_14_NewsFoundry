"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Brand } from "@/components/brand";
import { useAuth } from "@/components/auth-provider";

export function LoginForm() {
  const { user, loading, signIn, error: sessionError, notice, retry } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [loading, user, router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      await signIn(String(form.get("email")).trim(), String(form.get("password")));
      router.replace("/");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Connexion impossible. Réessayez.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="login-screen">
      <div className="login-top"><Brand light /></div>
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-card-brand"><Brand /></div>
        <p className="eyebrow">VOTRE ESPACE ÉDITORIAL</p>
        <h1 id="login-title">L’actualité commence<br />par une connexion.</h1>
        <p className="login-description">Connectez-vous pour retrouver votre espace de revue de presse.</p>
        {loading || user ? (
          <div className="session-loading" role="status">
            <span className="spinner" aria-hidden="true" /> Vérification de votre session…
          </div>
        ) : (
          <form onSubmit={submit} className="login-form" aria-busy={pending}>
            {notice && !error && <p className="notice" role="status">{notice}</p>}
            {sessionError && (
              <div className="form-error" role="alert">
                <p>{sessionError}</p>
                <button type="button" className="text-button" onClick={retry}>Réessayer</button>
              </div>
            )}
            <div className="field">
              <label htmlFor="email">Adresse e-mail</label>
              <input id="email" name="email" type="email" placeholder="vous@exemple.fr"
                autoComplete="username" autoCapitalize="none" spellCheck={false}
                maxLength={254} required disabled={pending}
                aria-describedby={error ? "login-error" : undefined} />
            </div>
            <div className="field">
              <label htmlFor="password">Mot de passe</label>
              <div className="password-field">
                <input id="password" name="password" type={showPassword ? "text" : "password"}
                  placeholder="Votre mot de passe" autoComplete="current-password"
                  maxLength={256} required disabled={pending}
                  aria-describedby={error ? "login-error" : undefined} />
                <button className="password-toggle" type="button"
                  onClick={() => setShowPassword(!showPassword)} disabled={pending}
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  aria-pressed={showPassword}>
                  {showPassword ? "Masquer" : "Afficher"}
                </button>
              </div>
            </div>
            {error && <p className="form-error" id="login-error" role="alert">{error}</p>}
            <button className="primary-button" type="submit" disabled={pending}>
              {pending ? <><span className="spinner" aria-hidden="true" /> Connexion en cours…</> : <>Se connecter <span aria-hidden="true">↗</span></>}
            </button>
          </form>
        )}
        <p className="login-footnote">Un regard plus clair sur l’actualité.</p>
      </section>
      <p className="login-copyright">NewsFoundry · Votre assistant de revue de presse</p>
    </main>
  );
}
