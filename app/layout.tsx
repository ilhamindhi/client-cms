import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import TokenRefreshProvider from "@/components/TokenRefreshProvider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CMS Portal",
  description: "Admin and Superadmin CMS dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <TokenRefreshProvider>{children}</TokenRefreshProvider>
      </body>
    </html>
  );
}
