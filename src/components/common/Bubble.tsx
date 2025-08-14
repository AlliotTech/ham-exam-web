"use client";

import * as React from "react";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type BubbleProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  children: React.ReactNode;
  className?: string;
  autoHideMs?: number | null;
};

export function Bubble({ open, onOpenChange, children, className, autoHideMs = 2000 }: BubbleProps) {
  const timerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (!open) return;
    if (!autoHideMs) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => onOpenChange(false), autoHideMs);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [open, autoHideMs, onOpenChange]);

  if (!open) return null;
  return (
    <div
      className={cn(
        "absolute -top-2 left-0 -translate-y-full z-50",
        "rounded-md border bg-popover text-foreground shadow",
        "px-3 py-2 text-xs",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0">{children}</div>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="opacity-70 hover:opacity-100 transition-opacity"
          aria-label="关闭提示"
        >
          <XIcon className="h-3.5 w-3.5" />
        </button>
      </div>
      <div
        className="absolute left-4 -bottom-2 w-0 h-0"
        aria-hidden
        style={{
          borderLeft: "6px solid transparent",
          borderRight: "6px solid transparent",
          borderTop: "6px solid hsl(var(--popover))",
          filter: "drop-shadow(0 1px 0 rgba(0,0,0,0.06))",
        }}
      />
    </div>
  );
}


