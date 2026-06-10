import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WebSync AutoPost | Autonomous Content Pipeline Dashboard",
  description: "Synchronize your website feeds, automatically scrape news/products, generate blog drafts using Gemini AI, and schedule/post content to WordPress and social channels at custom intervals.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
