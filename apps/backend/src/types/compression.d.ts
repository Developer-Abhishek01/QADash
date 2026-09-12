declare module 'compression' {
  import { Request, Response, RequestHandler } from 'express';

  interface CompressionFilter {
    (req: Request, res: Response): boolean;
  }

  interface CompressionOptions {
    threshold?: number | string;
    filter?: CompressionFilter;
    level?: number;
    memLevel?: number;
    strategy?: number;
    chunkSize?: number;
    windowBits?: number;
    flush?: number;
    finishFlush?: number;
    maxOutputLength?: number;
    skip?: CompressionFilter;
  }

  function compression(options?: CompressionOptions): RequestHandler;

  export default compression;
}
