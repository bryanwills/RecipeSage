import { Readable } from "stream";
import sharp from "sharp";

export class FileTransformError extends Error {
  constructor() {
    super();
    this.name = "FileTransformError";
  }
}

export const transformImageStream = (
  width: number,
  height: number,
  quality: number,
  fit: keyof sharp.FitEnum,
) => {
  return sharp()
    .rotate() // Rotates based on EXIF data
    .resize(width, height, {
      fit,
    })
    .jpeg({
      quality,
      // chromaSubsampling: '4:4:4' // Enable this option to prevent color loss at low quality - increases image size
    });
};

export const transformImageStreamToBuffer = async (
  inputStream: Readable,
  width: number,
  height: number,
  quality: number,
  fit: keyof sharp.FitEnum,
) => {
  const transformer = sharp()
    .rotate() // Rotates based on EXIF data
    .resize(width, height, {
      fit,
    })
    .jpeg({
      quality,
      // chromaSubsampling: '4:4:4' // Enable this option to prevent color loss at low quality - increases image size
    });

  inputStream.pipe(transformer);

  return transformer.toBuffer();
};

export const transformImageBuffer = async (
  buffer: Buffer,
  width: number,
  height: number,
  quality: number,
  fit: keyof sharp.FitEnum,
) => {
  return sharp(buffer)
    .rotate() // Rotates based on EXIF data
    .resize(width, height, {
      fit,
    })
    .jpeg({
      quality,
      // chromaSubsampling: '4:4:4' // Enable this option to prevent color loss at low quality - increases image size
    })
    .toBuffer()
    .catch(() => {
      throw new FileTransformError();
    });
};
