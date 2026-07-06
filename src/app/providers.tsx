"use client";

import { NextUIProvider } from "@nextui-org/react";
import { ThemeProvider } from "next-themes";
import AuthProvider from "@/components/providers/SessionProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextUIProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        //今回はダークモードの設定なし
        // defaultTheme="system"
        enableSystem
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </ThemeProvider>
    </NextUIProvider>
  );
}