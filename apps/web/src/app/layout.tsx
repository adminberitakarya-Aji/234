import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bet Platform — Devnet",
  description: "Crypto betting platform on Solana devnet",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen bg-bet-dark text-bet-text">
        {children}
      </body>
    </html>
  );
}