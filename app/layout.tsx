import type { Metadata } from "next";
import { Fraunces, Figtree } from "next/font/google";
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
  title: "Happy People — Henrik Seegers",
  description:
    "Enlightenment Seminars for people who are stuck in life. The path of Happy People.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className={`${display.variable} ${body.variable} h-full`}>
      <body className="site-grain min-h-full antialiased">{children}</body>
    </html>
  );
}
