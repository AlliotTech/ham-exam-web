"use client";

import * as React from "react";

type Props = {
  // Stats text node shown centered above controls
  statsNode?: React.ReactNode;
  // Fallback simple stats (used when statsNode not provided)
  answeredCount?: number;
  total?: number;
  // Desktop slots
  left?: React.ReactNode;
  right?: React.ReactNode;
  center?: React.ReactNode;
  // Mobile slots
  mobileTop?: React.ReactNode; // e.g., 2 columns
  mobileBottom?: React.ReactNode; // e.g., 3 columns
};

export function BottomBar({
  statsNode,
  answeredCount,
  total,
  left,
  right,
  center,
  mobileTop,
  mobileBottom,
}: Props) {
  return (
    <div
      className="fixed left-0 right-0 bottom-0 z-40 border-t bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="container mx-auto max-w-4xl px-4 py-2 space-y-2">
        {statsNode ? (
          <div className="text-sm text-muted-foreground text-center">{statsNode}</div>
        ) : (
          <div className="text-sm text-muted-foreground text-center">
            已作答 {answeredCount ?? 0} / {total ?? 0}
          </div>
        )}
        {/* Desktop */}
        <div className="hidden sm:flex items-center justify-between gap-2">
          <div>{left}</div>
          <div className="flex items-center gap-2">{center}</div>
          <div className="flex items-center gap-2">{right}</div>
        </div>
        {/* Mobile */}
        <div className="sm:hidden space-y-2">
          <div>{mobileTop}</div>
          {mobileBottom ? <div>{mobileBottom}</div> : null}
        </div>
      </div>
    </div>
  );
}
