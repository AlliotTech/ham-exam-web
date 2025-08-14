"use client";

import * as React from "react";
import Image from "next/image";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export type PreviewableImageProps = {
  src: string;
  alt: string;
  title?: string;
  containerClassName?: string; // inline container for the small image
  previewHeightClassName?: string; // e.g., h-[80vh]
  sizes?: string;
  priority?: boolean;
  renderTrigger?: (open: () => void) => React.ReactNode; // optional external trigger
};

export function PreviewableImage({
  src,
  alt,
  title,
  containerClassName,
  previewHeightClassName = "h-[80vh]",
  sizes = "(max-width: 640px) 100vw, 640px",
  priority = false,
  renderTrigger,
}: PreviewableImageProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      {renderTrigger ? (
        renderTrigger(() => setOpen(true))
      ) : (
        <div className={"relative w-full h-40 sm:h-64 " + (containerClassName ?? "")}>
          <Image
            src={src}
            alt={alt}
            fill
            sizes={sizes}
            priority={priority}
            placeholder="blur"
            blurDataURL="data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='10' viewBox='0 0 16 10'%3E%3Crect width='16' height='10' fill='%23f3f4f6'/%3E%3C/svg%3E"
            className="object-contain rounded border cursor-zoom-in"
            onClick={() => setOpen(true)}
          />
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[90vw]">
          <DialogHeader>
            <DialogTitle className="sr-only">{title || alt || "图片预览"}</DialogTitle>
            <DialogDescription className="sr-only">点击空白处或按 Esc 关闭对话框</DialogDescription>
          </DialogHeader>
          <div className={"relative w-full " + previewHeightClassName}>
            <Image src={src} alt={title || alt || "图片预览"} fill sizes="100vw" className="object-contain" />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}


