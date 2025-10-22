// app/layout.tsx

import "@/app/globals.css";
import { Inter } from "next/font/google";
import { ReactNode } from "react";
import { AuthProvider } from "@/components/providers/AuthProvider";
// import MenuPrincipal from "@/components/MenuPrincipal";

export const metadata = {
  title: "Obras - EPAMIG",
  description: "Gestão de Obras EPAMIG",
};
  const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#025C3E" />
        <link rel="apple-touch-icon" href="/epamig_logo.svg" />
      </head>
        <body className={`${inter.className} min-h-screen flex flex-col`}>
          <script src="/register-sw.js" async />
          <AuthProvider>
            <div className="flex-1 flex flex-col">
              {children}
            </div>
          </AuthProvider>
        </body>
    </html>
  );
}
