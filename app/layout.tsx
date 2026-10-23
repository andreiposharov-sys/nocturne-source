import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nocturne — Claude Activation",
  description: "Activate your Claude Pro or Max plan with an independent English-language interface.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
