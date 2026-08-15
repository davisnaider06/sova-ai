import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { ClerkThemeProvider } from "@/components/providers/clerk-theme-provider";
import { AmbientBackground } from "@/components/providers/ambient-background";
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
  title: "Sova AI — Venda mais na TikTok Shop",
  description:
    "Cole o link de um produto e receba em segundos: volume de vendas, concorrência, margem, vídeos virais, roteiro pronto e previsão de lucro.",
  applicationName: "Sova",
  appleWebApp: {
    // Sem isto o iOS abre o atalho dentro do Safari, com a barra de endereço.
    capable: true,
    title: "Sova",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  // `viewportFit: cover` + o padding de safe-area no body é o que impede o
  // conteúdo de ficar embaixo do notch e da barra de gestos no iPhone quando
  // o app roda instalado, em tela cheia.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef0e6" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0b" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col text-ink-primary">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          <ClerkThemeProvider>
            <AmbientBackground />
            {children}
          </ClerkThemeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
