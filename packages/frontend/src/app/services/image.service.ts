import { Injectable, inject } from "@angular/core";

import { HttpService } from "./http.service";
import { ErrorHandlers } from "./http-error-handler.service";
import { b642u8 } from "@recipesage/util/shared";
import type { ImageSummary } from "@recipesage/prisma";

export interface Image {
  id: string;
  location: string;
}

@Injectable({
  providedIn: "root",
})
export class ImageService {
  private httpService = inject(HttpService);

  create(file: File, errorHandlers?: ErrorHandlers) {
    const formData: FormData = new FormData();
    formData.append("file", file, file.name);

    return this.httpService.multipartRequestWithWrapper<ImageSummary>({
      path: "images/createRecipeImage",
      method: "POST",
      payload: formData,
      query: {},
      errorHandlers,
    });
  }

  createFromUrl(url: string, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<ImageSummary>({
      path: "images/createRecipeImageFromUrl",
      method: "POST",
      payload: {
        url,
      },
      query: undefined,
      errorHandlers,
    });
  }

  createFromB64(b64: string, errorHandlers?: ErrorHandlers) {
    const u8 = b642u8(b64);
    const file = new File([u8], "image");

    const formData: FormData = new FormData();
    formData.append("file", file, file.name);

    return this.httpService.multipartRequestWithWrapper<ImageSummary>({
      path: "images/createRecipeImage",
      method: "POST",
      payload: formData,
      query: {},
      errorHandlers,
    });
  }
}
