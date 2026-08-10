"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { useTheme } from "next-themes";

export function ClerkThemeProvider({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";

  return (
    <ClerkProvider
      appearance={{
        theme: isDark ? dark : undefined,
        variables: {
          colorPrimary: "#c2ea22",
          colorPrimaryForeground: "#0b0d05",
          colorBackground: isDark ? "#16171a" : "#ffffff",
          colorInput: isDark ? "#1e1f23" : "#f2f2ee",
          colorForeground: isDark ? "#f7f8f2" : "#14140f",
          colorMutedForeground: isDark ? "#b7b8ad" : "#6b6d64",
          colorNeutral: isDark ? "#f7f8f2" : "#14140f",
          borderRadius: "1rem",
        },
        elements: {
          card: "shadow-none border border-black/10 dark:border-white/10",
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
