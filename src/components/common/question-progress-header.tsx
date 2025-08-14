"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export type QuestionProgressHeaderProps = {
  percent: number;
  left?: React.ReactNode; // optional override
  right?: React.ReactNode; // settings/search buttons
  meta?: React.ReactNode; // extra information line
};

export function QuestionProgressHeader({
  percent,
  left,
  right,
  meta,
}: QuestionProgressHeaderProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        {left ?? (
          <Button asChild variant="outline">
            <Link href="/">返回首页</Link>
          </Button>
        )}
        <div className="flex items-center gap-3">{right}</div>
      </div>
      <div className="flex items-center gap-4 justify-between flex-wrap">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="min-w-24 text-sm text-muted-foreground">进度 {percent}%</div>
          <Progress value={percent} className="h-2 flex-1 sm:flex-none" aria-label="作答进度" />
        </div>
        {meta ? <div className="hidden sm:block text-sm text-muted-foreground">{meta}</div> : null}
      </div>
    </div>
  );
}
