import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from '@/components/providers'
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: 'WhatAgent — Recepcionista IA para WhatsApp',
    template: '%s — WhatAgent',
  },
  description: 'Automatiza la atención al cliente de tu negocio en WhatsApp con inteligencia artificial. Responde 24/7, agenda citas y recupera leads automáticamente.',
  keywords: ['WhatsApp', 'IA', 'inteligencia artificial', 'recepcionista', 'automatización', 'chatbot', 'PYME'],
  authors: [{ name: 'WhatAgent' }],
  creator: 'WhatAgent',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://whatagent-pi.vercel.app'),
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    siteName: 'WhatAgent',
    title: 'WhatAgent — Recepcionista IA para WhatsApp',
    description: 'Automatiza la atención al cliente de tu negocio en WhatsApp con IA.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
