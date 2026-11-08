"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { usePathname } from "next/navigation";

export function ThemeProvider({ 
  children, 
  ...props 
}: React.ComponentProps<typeof NextThemesProvider>) {
  const pathname = usePathname();
  return (
    <NextThemesProvider attribute="class" defaultTheme="light" enableSystem {...props} forcedTheme={pathname === "/" ? "light" : props.forcedTheme}>
      {children}
    </NextThemesProvider>
  );
}
