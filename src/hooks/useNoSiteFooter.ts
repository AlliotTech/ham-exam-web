import { useEffect } from "react";

export function useNoSiteFooter(): void {
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.body.classList.add("no-site-footer");
      return () => {
        document.body.classList.remove("no-site-footer");
      };
    }
    return;
  }, []);
}
