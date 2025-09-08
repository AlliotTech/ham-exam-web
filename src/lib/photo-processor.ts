// eslint-disable-next-line @typescript-eslint/no-require-imports
const Compressor = require('compressorjs');
import { PhotoType, PhotoResult, PHOTO_CONFIG } from '@/types/photo';

/**
 * 处理照片压缩
 * @param type 照片类型 ('id' | 'profile')
 * @param file 原始文件
 * @returns Promise<PhotoResult>
 */
export function processPhoto(type: PhotoType, file: File): Promise<PhotoResult> {
  const params = PHOTO_CONFIG[type];
  
  return new Promise((resolve, reject) => {
    new Compressor(file, {
      ...params,
      success(result: File) {
        const reader = new FileReader();
        reader.readAsDataURL(result);
        reader.onload = () => {
          // 创建临时图片元素来获取尺寸
          const img = new Image();
          img.onload = () => {
            resolve({
              file: result,
              dataUrl: reader.result as string,
              width: img.naturalWidth,
              height: img.naturalHeight,
              size: result.size,
              type: result.type,
            });
          };
          img.onerror = () => {
            reject(new Error('无法读取处理后的图片尺寸'));
          };
          img.src = reader.result as string;
        };
        reader.onerror = () => {
          reject(new Error('无法读取处理后的图片数据'));
        };
      },
      error(err: Error) {
        reject(new Error(`处理失败，请尝试更换照片格式，或对着照片截图再上传。详细信息：${err.message}`));
      }
    });
  });
}

/**
 * 验证文件类型
 * @param file 文件对象
 * @returns boolean
 */
export function validateFileType(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * 格式化文件大小
 * @param bytes 字节数
 * @returns 格式化后的字符串
 */
export function formatFileSize(bytes: number): string {
  return (bytes / 1024).toFixed(2) + ' KB';
}

/**
 * 下载处理后的照片
 * @param result 处理结果
 * @param originalName 原始文件名
 */
export function downloadPhoto(result: PhotoResult, originalName: string): void {
  const link = document.createElement('a');
  link.href = result.dataUrl;
  
  // 生成新的文件名
  const extension = result.type.split('/')[1] || 'jpg';
  const baseName = originalName.replace(/\.[^/.]+$/, '');
  link.download = `${baseName}_processed.${extension}`;
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
