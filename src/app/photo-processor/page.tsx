import type { Metadata } from "next";
import { PhotoProcessor } from "@/components/common/PhotoProcessor";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "报名照片处理工具 - 业余无线电执照考试",
  description: "专业的业余无线电报名照片处理工具，快速处理符合要求的证件照和人像照，支持本地处理，保护隐私安全。",
  keywords: "业余无线电,报名照片,证件照处理,人像照处理,照片压缩",
};

export default function PhotoProcessorPage() {
  return (
    <main className="container mx-auto px-4 py-10 max-w-3xl">
      {/* 返回首页按钮 */}
      <div className="mb-6">
        <Button variant="ghost" asChild className="gap-2">
          <Link href="/">
            <ArrowLeft className="w-4 h-4" />
            返回首页
          </Link>
        </Button>
      </div>

      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          业余无线电报名照片处理
        </h1>
        <p className="text-gray-600">
          专业的照片处理工具，帮助您快速处理符合报名要求的证件照和人像照
        </p>
      </div>

      {/* 照片处理功能 */}
      <PhotoProcessor />

      {/* 相关链接 */}
      <div className="mt-12 p-6 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-medium text-blue-900 mb-3">
          处理完照片后，继续您的考试准备
        </h3>
        <div className="flex gap-3">
          <Button asChild>
            <Link href="/practice">开始练习</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/exam">模拟考试</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
