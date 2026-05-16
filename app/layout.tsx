import type { Metadata } from "next";
import { Fraunces, JetBrains_Mono, Onest } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const onest = Onest({
  subsets: ["latin", "cyrillic"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-onest",
  display: "swap",
});

/** Fraunces: `cyrillic` subset is not exposed by next/font for this family — latin + latin-ext only (see build error). Body copy uses Onest with Cyrillic. */
const fraunces = Fraunces({
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ArtPortrait Studio",
  description:
    "Editorial-фотосессия из одного селфи. Первый портрет — 100 ₽.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="ru" className="scroll-smooth">
        <body
          className={`${onest.variable} ${fraunces.variable} ${jetbrainsMono.variable} min-h-screen bg-page font-sans text-ink antialiased`}
        >
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
