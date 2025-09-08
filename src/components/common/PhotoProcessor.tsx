"use client";

import { useState } from 'react';
import { PhotoType, PhotoResult as PhotoResultType } from '@/types/photo';
import { processPhoto } from '@/lib/photo-processor';
import { PhotoUploader } from './PhotoUploader';
import { PhotoResult } from './PhotoResult';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, AlertCircle, Loader2 } from 'lucide-react';

export function PhotoProcessor() {
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<PhotoResultType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [originalFileName, setOriginalFileName] = useState<string>('');

  const handleFileSelect = async (type: PhotoType, file: File) => {
    setProcessing(true);
    setError(null);
    setResult(null);
    setOriginalFileName(file.name);

    try {
      const processedResult = await processPhoto(type, file);
      setResult(processedResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : '处理失败，请重试');
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    setOriginalFileName('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="w-5 h-5" />
          报名照片处理
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 说明文字 */}
        <div className="text-sm text-gray-600 space-y-2">
          <p>
            本工具旨在处理照片，使之符合
            <a 
              href="http://82.157.138.16:8091/CRAC/crac/index.html" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              业余无线电台操作技术能力验证及信息管理系统
            </a>
            的要求。处理过程在设备本地处理，不会保存到服务器。
          </p>
          <p className="text-amber-600">
            ⚠️ 本工具无法帮助处理人像照片的底色要求，仅能处理尺寸。若需换白底，请自行寻找其他解决方案。
          </p>
        </div>

        {/* 文件上传区域 */}
        {!result && !processing && (
          <PhotoUploader onFileSelect={handleFileSelect} disabled={processing} />
        )}

        {/* 处理中状态 */}
        {processing && (
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className="text-sm text-gray-600">正在处理照片，请稍候...</span>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-medium">处理失败</div>
              <div className="text-sm mt-1">{error}</div>
            </div>
          </div>
        )}

        {/* 处理结果 */}
        {result && (
          <div className="space-y-4">
            <PhotoResult 
              result={result} 
              originalFileName={originalFileName}
            />
            <div className="flex justify-center">
              <Button variant="outline" onClick={handleReset}>
                处理其他照片
              </Button>
            </div>
          </div>
        )}

        {/* 使用须知 */}
        <div className="text-xs text-gray-500 leading-relaxed border-t pt-4">
          <div className="font-medium mb-2">使用须知</div>
          <p>
            本工具提供的照片处理标准基于开发时的无线电考试报名要求制作。因政策可能随时调整，使用者应自行核实最新官方标准。
            开发者不对因政策变化导致的格式不符承担任何责任。使用者须自行验证处理后的照片是否符合要求，
            因照片不合格导致的报名问题，开发者不承担任何法律责任。本工具为第三方便民服务，
            与各级无线电管理机构无任何隶属或合作关系。使用本工具应同意上述条款。
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
