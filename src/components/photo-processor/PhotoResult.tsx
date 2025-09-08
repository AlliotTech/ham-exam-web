"use client";

import Image from 'next/image';
import { PhotoResult as PhotoResultType } from '@/types/photo';
import { formatFileSize, downloadPhoto } from '@/lib/photo-processor';
import { Button } from '@/components/ui/button';
import { Download, CheckCircle } from 'lucide-react';

interface PhotoResultProps {
  result: PhotoResultType;
  originalFileName: string;
  onDownload?: () => void;
}

export function PhotoResult({ result, originalFileName, onDownload }: PhotoResultProps) {
  const handleDownload = () => {
    downloadPhoto(result, originalFileName);
    onDownload?.();
  };

  return (
    <div className="space-y-4">
      {/* 成功提示 */}
      <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800">
        <CheckCircle className="w-4 h-4" />
        <span className="text-sm">处理完成！请右键或长按保存下方处理后的图片。</span>
      </div>

      {/* 图片详细信息 */}
      <div className="text-sm font-mono text-gray-600 bg-gray-50 p-3 rounded-lg">
        <div className="grid grid-cols-2 gap-2">
          <div>文件大小: {formatFileSize(result.size)}</div>
          <div>格式: {result.type}</div>
          <div>宽度: {result.width}px</div>
          <div>高度: {result.height}px</div>
        </div>
      </div>

      {/* 处理后的图片预览 */}
      <div className="relative w-full max-w-md mx-auto">
        <div className="relative aspect-auto border border-gray-200 rounded-lg overflow-hidden">
          <Image
            src={result.dataUrl}
            alt="处理后的照片"
            width={result.width}
            height={result.height}
            className="w-full h-auto object-contain"
            priority
          />
        </div>
      </div>

      {/* 下载按钮 */}
      <div className="flex justify-center">
        <Button onClick={handleDownload} className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          下载处理后的照片
        </Button>
      </div>
    </div>
  );
}
