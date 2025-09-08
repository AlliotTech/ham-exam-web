"use client";

import { usePathname } from "next/navigation";
import { Navigation } from "./Navigation";

export function ConditionalNavigation() {
  const pathname = usePathname();
  const isHomePage = pathname === "/";

  return isHomePage ? <Navigation /> : null;
}
