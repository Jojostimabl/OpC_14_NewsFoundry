"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Brand } from "@/components/brand";
import { useAuth } from "@/components/auth-provider";

export default function Home() {
  const { user, loading, error, retry, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user && !error) router.replace("/login");
  }, [loading, user, error, router]);

  if (loading || !user) {
    return (
      <main className="session-screen">
        <Brand />
        {error ? (
          <div className="session-error" role="alert">
            <p>{error}</p>
            <button className="primary-button" onClick={retry}>Réessayer</button>
            <button className="text-button" onClick={signOut}>Revenir à la connexion</button>
          </div>
        ) : <p role="status"><span className="spinner" aria-hidden="true" /> Vérification de votre session…</p>}
      </main>
    );
  }

  function logout() {
    signOut();
    router.replace("/login");
  }

  return (
    <main className="workspace">
      <header className="workspace-header">
        <Brand />
        <div className="account">
          <span className="account-email">{user.email}</span>
          <button className="secondary-button" onClick={logout}>Se déconnecter</button>
        </div>
      </header>
      <section className="welcome-card">
        <span className="welcome-icon" aria-hidden="true">✦</span>
        <p className="eyebrow">VOTRE ESPACE NEWSFOUNDRY</p>
        <h1>Bienvenue dans<br />votre atelier de presse.</h1>
        <p>Votre connexion est établie. Les discussions et la création de revues de presse seront disponibles prochainement.</p>
        <span className="connected-badge"><span aria-hidden="true" /> Connecté en tant que {user.email}</span>
      </section>
    </main>
  );
}
