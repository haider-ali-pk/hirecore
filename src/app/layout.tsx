import type { Metadata, Viewport } from "next";
import { Newsreader, Inter_Tight, Geist_Mono } from "next/font/google";
import "./globals.css";

/*
  Typography system
  - Display + serif body: Newsreader (variable weight, optical size axis)
  - UI / buttons / navigation: Inter Tight
  - Labels / data / stats: Geist Mono

  next/font self-hosts these at build time, so there are no runtime requests
  to Google and no layout shift.
*/

const display = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-display-loaded",
  display: "swap",
});

const sans = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-sans-loaded",
  display: "swap",
});

const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono-loaded",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "HireCore — AI Recruitment & HR Platform",
    template: "%s · HireCore",
  },
  description:
    "HireCore is the AI-powered recruitment and HR platform that screens, ranks and moves your best candidates forward, so your team can focus on hiring.",
  applicationName: "HireCore",
  keywords: [
    "recruitment software",
    "applicant tracking system",
    "AI hiring",
    "HR platform",
    "CV screening",
  ],
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#05070a",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
      style={
        {
          /* Body serif shares the same Newsreader files as the display face,
             so the font is downloaded once instead of twice. */
          "--font-serif-loaded": "var(--font-display-loaded)",
        } as React.CSSProperties
      }
    >
      {/* Browser extensions (Grammarly, password managers) inject attributes
          into <body> before React hydrates. This silences only that
          attribute mismatch on this one element. */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}