"use client";

import { useCallback, useState } from 'react';
import { PhotoType } from '@/types/photo';
import { validateFileType } from '@/lib/photo-processor';
import { CreditCard, User } from 'lucide-react';

interface PhotoUploaderProps {
  onFileSelect: (type: PhotoType, file: File) => void;
  disabled?: boolean;
}

export function PhotoUploader({ onFileSelect, disabled = false }: PhotoUploaderProps) {
  const [dragOver, setDragOver] = useState<PhotoType | null>(null);

  const handleFileChange = useCallback((type: PhotoType, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!validateFileType(file)) {
      alert('请选择有效的图片文件');
      return;
    }

    onFileSelect(type, file);
    // 清空input值，允许重复选择同一文件
    event.target.value = '';
  }, [onFileSelect]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
  }, []);

  const handleDragEnter = useCallback((type: PhotoType, event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(type);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    // 只有当离开整个区域时才清除状态
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOver(null);
    }
  }, []);

  const handleDrop = useCallback((type: PhotoType, event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(null);

    const files = event.dataTransfer.files;
    const file = files[0];
    
    if (!file) return;

    if (!validateFileType(file)) {
      alert('请选择有效的图片文件');
      return;
    }

    onFileSelect(type, file);
  }, [onFileSelect]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* 证件照上传 */}
      <div className="space-y-2">
        <label
          htmlFor="id-file"
          className={`
            relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}
            ${dragOver === 'id' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
          `}
          onDragOver={handleDragOver}
          onDragEnter={(e) => handleDragEnter('id', e)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop('id', e)}
        >
          <CreditCard className="w-8 h-8 text-gray-400 mb-2" />
          <span className="text-sm font-medium text-gray-700">选取证件照</span>
          <span className="text-xs text-gray-500 mt-1">点击选择或拖拽文件到此处</span>
          <span className="text-xs text-gray-400 mt-1">
            推荐尺寸: 1024×768 - 4096×3072
          </span>
        </label>
        <input
          id="id-file"
          type="file"
          accept="image/*"
          disabled={disabled}
          onChange={(e) => handleFileChange('id', e)}
          className="hidden"
        />
      </div>

      {/* 人像照上传 */}
      <div className="space-y-2">
        <label
          htmlFor="profile-file"
          className={`
            relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}
            ${dragOver === 'profile' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
          `}
          onDragOver={handleDragOver}
          onDragEnter={(e) => handleDragEnter('profile', e)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop('profile', e)}
        >
          <User className="w-8 h-8 text-gray-400 mb-2" />
          <span className="text-sm font-medium text-gray-700">选取人像照</span>
          <span className="text-xs text-gray-500 mt-1">点击选择或拖拽文件到此处</span>
          <span className="text-xs text-gray-400 mt-1">
            推荐尺寸: 300×400 - 3375×4500
          </span>
        </label>
        <input
          id="profile-file"
          type="file"
          accept="image/*"
          disabled={disabled}
          onChange={(e) => handleFileChange('profile', e)}
          className="hidden"
        />
      </div>
    </div>
  );
}
