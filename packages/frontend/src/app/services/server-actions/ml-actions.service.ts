import { Injectable } from "@angular/core";

import { ErrorHandlers } from "../http-error-handler.service";
import { ActionsBase, RouterInputs, RouterOutputs } from "./actions-base";

@Injectable({
  providedIn: "root",
})
export class MlActionsService extends ActionsBase {
  getRecipeFromOCR(
    input: RouterInputs["ml"]["getRecipeFromOCR"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["ml"]["getRecipeFromOCR"] | undefined> {
    return this.passThrough(
      () => this.trpc.ml.getRecipeFromOCR.mutate(input),
      errorHandlers,
    );
  }

  getRecipeFromPDF(
    input: RouterInputs["ml"]["getRecipeFromPDF"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["ml"]["getRecipeFromPDF"] | undefined> {
    return this.passThrough(
      () => this.trpc.ml.getRecipeFromPDF.mutate(input),
      errorHandlers,
    );
  }

  getRecipeFromText(
    input: RouterInputs["ml"]["getRecipeFromText"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["ml"]["getRecipeFromText"] | undefined> {
    return this.passThrough(
      () => this.trpc.ml.getRecipeFromText.mutate(input),
      errorHandlers,
    );
  }

  getNutritionFromText(
    input: RouterInputs["ml"]["getNutritionFromText"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["ml"]["getNutritionFromText"] | undefined> {
    return this.passThrough(
      () => this.trpc.ml.getNutritionFromText.mutate(input),
      errorHandlers,
    );
  }
}
