import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Solarpunk Zine Generator",
  description: "Generate a personalized one-page solarpunk zine with AI artwork and printable layouts.",
  icons: {
    icon: "/favicon.ico"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
