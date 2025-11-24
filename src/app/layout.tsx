import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { MissingKeysDialog } from "@/components/missing-keys-dialog";
import { OllamaProvider } from "@/lib/ollama-context";
import { Analytics } from '@vercel/analytics/next';
import { AuthInitializer } from "@/components/auth/auth-initializer";
import { QueryProvider } from "@/components/query-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { PostHogProvider } from "@/components/posthog-provider";
import { logEnvironmentStatus } from "@/lib/env-validation";
import { ProviderSelector } from "@/components/providers/provider-selector";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  ),
  title: {
    default: "Ecoheart | City of Olympia Climate AI",
    template: "%s | Ecoheart",
  },
  description:
    "AI-powered research assistant for City of Olympia climate action, environmental planning, and municipal operations. Access official city documents, climate data, and smart city analytics.",
  applicationName: "Ecoheart",
  openGraph: {
    title: "Ecoheart | City of Olympia Climate AI",
    description:
      "Smart data for sustainable cities. AI-powered assistant for Olympia city planning, climate action, and environmental initiatives.",
    url: "/",
    siteName: "Ecoheart",
    images: [
      {
        url: "/eco/eco-logo-trans.png",
        width: 1200,
        height: 630,
        alt: "Ecoheart - Smart data for cities",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ecoheart | City of Olympia Climate AI",
    description:
      "Smart data for sustainable cities. AI-powered city planning, climate action, and environmental research for the City of Olympia.",
    images: ["/eco/eco-logo-trans.png"],
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Log environment status on server-side render
  if (typeof window === 'undefined') {
    logEnvironmentStatus();
  }
  
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased overflow-x-hidden`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <AuthInitializer>
              <PostHogProvider>
                <OllamaProvider>
                  <MissingKeysDialog />
                  <ProviderSelector />
                  {children}
                  <Analytics />
                </OllamaProvider>
              </PostHogProvider>
            </AuthInitializer>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}