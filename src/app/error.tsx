"use client";

import * as React from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Optional: log error to monitoring
    // console.error(error);
  }, [error]);
  return (
    <html lang="zh-CN">
      <body>
        <div className="container mx-auto max-w-2xl px-4 py-10">
          <h2 className="text-lg font-semibold mb-2">页面出错了</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {error?.message || "发生未知错误。"}
          </p>
          <button
            className="inline-flex h-9 items-center justify-center rounded-md border bg-primary px-3 text-sm font-medium text-primary-foreground shadow transition-colors hover:opacity-90"
            onClick={() => reset()}
          >
            重试
          </button>
        </div>
      </body>
    </html>
  );
}


