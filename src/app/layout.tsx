import type { Metadata } from "next";
import localFont from "next/font/local";

import "./globals.css";

/**
 * The brand's own faces, self-hosted from `src/app/fonts`.
 *
 * These are licensed to Burberry, not to us. They belong in a POC built for
 * Burberry and must not travel to another project.
 *
 * The weight maps below are Burberry's, read off the 190 `@font-face` rules
 * their site declares — which resolve to only three files:
 *
 *   burberry-house-regular  -> BurberrySerif at 300, 400, 500 and 700
 *   burberry-oracle-book    -> BurberrySansSerif at 300, 350 and 400
 *   oracle-book-medium      -> BurberrySansSerif at 500 and 700
 *
 * So the serif is a single cut that every weight points at, and the sans has
 * exactly two. Declaring the same aliases here rather than collapsing them to
 * one weight each is deliberate: it reproduces their rendering exactly, and it
 * stops a stray `font-bold` on serif text from asking the browser to synthesise
 * a bold that the brand does not have.
 */
const brandSerif = localFont({
  variable: "--font-serif-brand",
  display: "swap",
  src: [
    { path: "./fonts/burberry-house-regular.woff2", weight: "300", style: "normal" },
    { path: "./fonts/burberry-house-regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/burberry-house-regular.woff2", weight: "500", style: "normal" },
    { path: "./fonts/burberry-house-regular.woff2", weight: "700", style: "normal" },
  ],
});

const brandSans = localFont({
  variable: "--font-sans-brand",
  display: "swap",
  src: [
    { path: "./fonts/burberry-oracle-book.woff2", weight: "300", style: "normal" },
    { path: "./fonts/burberry-oracle-book.woff2", weight: "350", style: "normal" },
    { path: "./fonts/burberry-oracle-book.woff2", weight: "400", style: "normal" },
    { path: "./fonts/oracle-book-medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/oracle-book-medium.woff2", weight: "700", style: "normal" },
  ],
});

export const metadata: Metadata = {
  title: "Bespoke Trench | Burberry",
  description: "In-store advisor configurator for the bespoke trench.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${brandSans.variable} ${brandSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
