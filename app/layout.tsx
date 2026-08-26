import type { Metadata, Viewport } from "next";
import { Fraunces, Figtree } from "next/font/google";
import { DEFAULT_OG_IMAGE, SITE_NAME, getSiteUrl } from "@/lib/seo";
import "./globals.css";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
});

const body = Figtree({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  applicationName: SITE_NAME,
  title: {
    default: `${SITE_NAME} — Hendrik Seegers`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Enlightenment Seminars for people who are stuck in life. The path of Happy People.",
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    images: [{ url: DEFAULT_OG_IMAGE, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    images: [DEFAULT_OG_IMAGE],
  },
  icons: {
    icon: [{ url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" }],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="nl"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${display.variable} ${body.variable} h-full`}
    >
      <head>
        <link
          rel="preload"
          href="/audio/microchip.mp3"
          as="fetch"
          crossOrigin="anonymous"
        />
      </head>
      <body className="site-grain min-h-full antialiased">{children}</body>
    </html>
  );
}
