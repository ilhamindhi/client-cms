import type { Metadata } from "next";
import { JetBrains_Mono, Manrope } from "next/font/google";
import TokenRefreshProvider from "@/components/TokenRefreshProvider";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
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
        className={`${manrope.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <TokenRefreshProvider>{children}</TokenRefreshProvider>
      </body>
    </html>
  );
}
