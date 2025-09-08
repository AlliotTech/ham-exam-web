import type { Metadata } from "next";
import { PhotoProcessor } from "@/components/photo-processor/PhotoProcessor";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "报名照片处理工具 - 业余无线电执照考试",
  description: "专业的业余无线电报名照片处理工具，快速处理符合要求的证件照和人像照，支持本地处理，保护隐私安全。",
  keywords: "业余无线电,报名照片,证件照处理,人像照处理,照片压缩",
};

export default function PhotoProcessorPage() {
  return (
    <main className="container mx-auto px-4 py-6 max-w-4xl space-y-4 pb-28 sm:pb-20">
      {/* 返回首页按钮 */}
      <div className="mb-6">
        <Button variant="outline" asChild>
          <Link href="/">返回首页</Link>
        </Button>
      </div>

      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-lg font-semibold mb-2">
          业余无线电报名照片处理
        </h1>
        <p className="text-muted-foreground">
          专业的照片处理工具，帮助您快速处理符合报名要求的证件照和人像照
        </p>
      </div>

      {/* 照片处理功能 */}
      <PhotoProcessor />
    </main>
  );
}
