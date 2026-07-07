import type { Metadata, Viewport } from "next";
import { PwaRegister } from "@/components/pwa-register";
import { validateSecurityEnv } from "@/lib/security-env";
import "./globals.css";

export const metadata: Metadata = {
  title: "LuxERP Specifications",
  description: "Digital order specification workspace",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "LuxERP"
  }
};

export const viewport: Viewport = {
  themeColor: "#0f172a"
};

validateSecurityEnv();

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
