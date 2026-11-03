import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";

export const metadata: Metadata = {
  title: "NewsFoundry",
  description: "Votre assistant de revue de presse par IA.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="fr"><body><AuthProvider>{children}</AuthProvider></body></html>;
}
