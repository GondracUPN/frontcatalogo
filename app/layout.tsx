import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import RootShell from "./components/RootShell";
import ClientDomCleanup from "./components/ClientDomCleanup";
import NavigationProgress from "./components/NavigationProgress";
import CookieConsent from "./components/CookieConsent";
import PageViewTracker from "./components/PageViewTracker";
import SiteThemeProvider from "./components/theme/SiteThemeProvider";
import { getActiveSiteTheme } from "@/lib/site-theme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Serifa editorial de algunas campañas. Sin precarga: solo se descarga si se usa.
const editorialSerif = Instrument_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: "400",
  preload: false,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.macsomenos.com"),
  title: { default: "Macsomenos | Equipos Apple en Perú", template: "%s | Macsomenos" },
  description: "Explora MacBook, iPhone, iPad y Apple Watch nuevos, Open Box y usados. Consulta fotografías, condición y precio antes de solicitar tu equipo.",
  alternates: { canonical: "/" },
  openGraph: { type: "website", locale: "es_PE", siteName: "Macsomenos", title: "Macsomenos | Equipos Apple en Perú", description: "Explora equipos Apple y solicita el que mejor se adapte a ti.", url: "/" },
  twitter: { card: "summary_large_image" },
  icons: {
    icon: [
      { url: "/favicon.ico?v=2", sizes: "any" },
      { url: "/icon.png?v=2", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/favicon.ico?v=2",
    apple: [{ url: "/apple-icon.png?v=2", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = { themeColor: "#f5f5f7" };

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const theme = await getActiveSiteTheme();
  return (
    <html lang="es">
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} ${editorialSerif.variable} bg-[var(--background)] text-[var(--foreground)] antialiased`}
      >
        <ClientDomCleanup />
        <NavigationProgress />
        <PageViewTracker />
        <SiteThemeProvider initialTheme={theme}>
          <RootShell>{children}</RootShell>
        </SiteThemeProvider>
        <CookieConsent />
      </body>
    </html>
  );
}
