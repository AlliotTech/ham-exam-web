export type PhotoType = 'id' | 'profile';

export interface PhotoProcessorParams {
  quality: number;
  convertTypes: string[];
  convertSize: number;
  maxWidth: number;
  maxHeight: number;
  minWidth: number;
  minHeight: number;
}

export interface PhotoResult {
  file: File;
  dataUrl: string;
  width: number;
  height: number;
  size: number;
  type: string;
}

export interface PhotoProcessorConfig {
  id: PhotoProcessorParams;
  profile: PhotoProcessorParams;
}

export const PHOTO_CONFIG: PhotoProcessorConfig = {
  // 证件参数
  id: {
    quality: 0.8,
    convertTypes: ["image/png", 'image/jpeg'],
    convertSize: 1,
    maxWidth: 4096,
    maxHeight: 3072,
    minWidth: 1024,
    minHeight: 768,
  },
  // 个人照片参数
  profile: {
    quality: 0.8,
    convertTypes: ["image/png", 'image/jpeg'],
    convertSize: 1,
    maxHeight: 4500,
    maxWidth: 3375,
    minHeight: 400,
    minWidth: 300,
  }
};
