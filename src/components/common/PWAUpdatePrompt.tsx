"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Detect when a new service worker is waiting and prompt user to reload to get the latest content
export function PWAUpdatePrompt() {
  const [open, setOpen] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    function onControllerChange() {
      // The new SW has taken control; reload to get fresh content
      setOpen(false);
      setWaitingWorker(null);
      try {
        window.location.reload();
      } catch {}
    }

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    let removeVisibility: (() => void) | undefined;
    navigator.serviceWorker.ready
      .then((reg) => {
        // proactively check for update when page becomes visible
        const onVisibility = () => {
          if (document.visibilityState === "visible") {
            try {
              reg.update();
            } catch {}
          }
        };
        document.addEventListener("visibilitychange", onVisibility);
        removeVisibility = () => document.removeEventListener("visibilitychange", onVisibility);

        // If a SW is waiting after updatefound, show prompt
        if (reg.waiting) {
          setWaitingWorker(reg.waiting);
          setOpen(true);
        }
        reg.addEventListener("updatefound", () => {
          const sw = reg.installing;
          if (!sw) return;
          sw.addEventListener("statechange", () => {
            if (sw.state === "installed" && navigator.serviceWorker.controller) {
              setWaitingWorker(reg.waiting || sw);
              setOpen(true);
            }
          });
        });
      })
      .catch(() => {});

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      if (removeVisibility) removeVisibility();
    };
  }, []);

  function reloadWithNewSW() {
    if (!waitingWorker) return;
    // Tell the SW to skip waiting and activate immediately
    try {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    } catch {}
    try {
      waitingWorker.postMessage({ type: "skip-waiting" });
    } catch {}
    // After controllerchange listener will close the dialog
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>发现新版本</DialogTitle>
          <DialogDescription>有可用更新，刷新以加载最新题库与功能。</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 justify-end">
          <Button variant="outline" onClick={() => setOpen(false)}>稍后</Button>
          <Button onClick={reloadWithNewSW}>立即更新</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


