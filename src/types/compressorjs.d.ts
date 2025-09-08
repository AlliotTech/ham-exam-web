declare module 'compressorjs' {
  interface CompressorOptions {
    quality?: number;
    convertTypes?: string[];
    convertSize?: number;
    maxWidth?: number;
    maxHeight?: number;
    minWidth?: number;
    minHeight?: number;
    success?: (result: File) => void;
    error?: (error: Error) => void;
  }

  class Compressor {
    constructor(file: File, options: CompressorOptions);
  }

  export = Compressor;
}
