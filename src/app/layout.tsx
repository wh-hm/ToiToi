import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { Providers } from "@/app/providers";
import LayoutWrapper from "@/components/LayoutWrapper";
import "@/app/css/globals.css";
import { FlashMessageListener } from "@/components/FlashMessageListener";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ToiToi",
  description: "学習タスク管理やメモをこれ一つで一元管理。ひとりで頑張る毎日にちょっとした楽しさと達成感を届ける学習サポートアプリです。",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <LayoutWrapper>
            {children}
          </LayoutWrapper>
        </Providers>
        <FlashMessageListener />

        <Toaster />
      </body>
    </html>
  );
}