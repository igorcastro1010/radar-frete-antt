import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Radar Frete ANTT · Monitor de pisos mínimos",
  description:
    "Tabela oficial, comparação de coeficientes e acompanhamento das publicações de pisos mínimos de frete da ANTT.",
  robots: { index: true, follow: true },
};
export const viewport: Viewport = { themeColor: "#0d4843" };
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
