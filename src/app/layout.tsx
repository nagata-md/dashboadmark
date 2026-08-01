import type { Metadata } from "next";
import { Noto_Sans_JP, Archivo } from "next/font/google";
import "./globals.css";

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  display: "swap",
});

const archivo = Archivo({
  variable: "--font-archivo-google",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "住宅マーケティング数値ダッシュボード（仮称）",
  description:
    "施策〜反響〜来場〜契約までのマーケティングファネルを一気通貫で管理するダッシュボード",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${notoSansJP.variable} ${archivo.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-100 text-ink">
        {children}
      </body>
    </html>
  );
}
