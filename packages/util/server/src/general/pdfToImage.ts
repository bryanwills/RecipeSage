import { spawn } from "node:child_process";

export class PDFToImageTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PDFToImageTimeoutError";
  }
}

const MAX_EXTRACT_TIME = 10000;

/**
 * Can take either a buffer or a file path
 */
export const pdfToImage = async (
  source: Buffer | string,
  page: number,
  quality = 85,
): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const isFilePath = typeof source === "string";
    const args = [
      "-singlefile",
      "-r",
      "72",
      "-jpeg",
      "-jpegopt",
      `quality=${quality}`,
      "-f",
      String(page),
    ];
    if (isFilePath) {
      args.push(source);
    }

    const proc = spawn("pdftoppm", args);

    const timeout = setTimeout(() => {
      proc.kill();
      reject(new PDFToImageTimeoutError("Timeout while waiting for pdftoppm"));
    }, MAX_EXTRACT_TIME);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any[] = [];
    proc.stdout.on("data", function (data) {
      result.push(data);
    });
    proc.on("close", () => {
      clearTimeout(timeout);
      resolve(Buffer.concat(result));
    });
    if (!isFilePath) {
      proc.stdin.end(source);
    }
  });
};
