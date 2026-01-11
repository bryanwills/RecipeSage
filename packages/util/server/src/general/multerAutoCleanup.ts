import type { NextFunction, Request, Response } from "express";
// We import multer to mutate the express Request/Response types
import "multer";
import { unlink } from "fs/promises";
import * as Sentry from "@sentry/node";

export function multerAutoCleanup(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  res.on("close", () => {
    if (typeof req.file != "undefined") {
      unlink(req.file.path).catch((e) => Sentry.captureException(e));
    }

    const files = req.files;
    if (typeof files != "undefined") {
      if (Array.isArray(files)) {
        files.forEach((file) => {
          unlink(file.path).catch((e) => Sentry.captureException(e));
        });
      } else {
        Object.keys(files).forEach((key) => {
          const keyFiles = files[key];
          if (Array.isArray(keyFiles)) {
            keyFiles.forEach((file) => {
              unlink(file.path).catch((e) => Sentry.captureException(e));
            });
          }
        });
      }
    }
  });

  next();
}
