import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import RootShell from "./components/RootShell";
import ClientDomCleanup from "./components/ClientDomCleanup";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Macsomenos | Catalogo",
  description: "Tienda premium de equipos Apple nuevos, open box y usados seleccionados.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} bg-[var(--background)] text-[var(--foreground)] antialiased`}
      >
        <ClientDomCleanup />
        <RootShell>{children}</RootShell>
      </body>
    </html>
  );
}
