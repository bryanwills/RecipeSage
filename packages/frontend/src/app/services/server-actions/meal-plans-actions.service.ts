import { Injectable } from "@angular/core";

import { ErrorHandlers } from "../http-error-handler.service";
import { ActionsBase, RouterInputs, RouterOutputs } from "./actions-base";
import { getLocalDb, ObjectStoreName } from "../../utils/localDb";

@Injectable({
  providedIn: "root",
})
export class MealPlansActionsService extends ActionsBase {
  getMealPlan(
    input: RouterInputs["mealPlans"]["getMealPlan"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["mealPlans"]["getMealPlan"] | undefined> {
    return this.executeQuery(
      () => this.trpc.mealPlans.getMealPlan.query(input),
      async () => {
        const localDb = await getLocalDb();
        return localDb.get(ObjectStoreName.MealPlans, input.id);
      },
      errorHandlers,
    );
  }

  getMealPlans(
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["mealPlans"]["getMealPlans"] | undefined> {
    return this.executeQuery(
      () => this.trpc.mealPlans.getMealPlans.query(),
      async () => {
        const localDb = await getLocalDb();
        return localDb.getAll(ObjectStoreName.MealPlans);
      },
      errorHandlers,
    );
  }

  getMealPlanItems(
    input: RouterInputs["mealPlans"]["getMealPlanItems"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["mealPlans"]["getMealPlanItems"] | undefined> {
    return this.executeQuery(
      () => this.trpc.mealPlans.getMealPlanItems.query(input),
      async () => {
        const localDb = await getLocalDb();
        const mealPlan = await localDb.get(
          ObjectStoreName.MealPlans,
          input.mealPlanId,
        );
        if (!mealPlan) return undefined;
        return mealPlan.items;
      },
      errorHandlers,
    );
  }

  createMealPlan(
    input: RouterInputs["mealPlans"]["createMealPlan"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["mealPlans"]["createMealPlan"] | undefined> {
    return this.executeMutation(
      () => this.trpc.mealPlans.createMealPlan.mutate(input),
      () => {
        void this.syncService.syncMealPlans();
      },
      errorHandlers,
    );
  }

  createMealPlanItem(
    input: RouterInputs["mealPlans"]["createMealPlanItem"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["mealPlans"]["createMealPlanItem"] | undefined> {
    return this.executeMutation(
      () => this.trpc.mealPlans.createMealPlanItem.mutate(input),
      () => {
        void this.syncService.syncMealPlans();
      },
      errorHandlers,
    );
  }

  createMealPlanItems(
    input: RouterInputs["mealPlans"]["createMealPlanItems"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["mealPlans"]["createMealPlanItems"] | undefined> {
    return this.executeMutation(
      () => this.trpc.mealPlans.createMealPlanItems.mutate(input),
      () => {
        void this.syncService.syncMealPlans();
      },
      errorHandlers,
    );
  }

  deleteMealPlan(
    input: RouterInputs["mealPlans"]["deleteMealPlan"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["mealPlans"]["deleteMealPlan"] | undefined> {
    return this.executeMutation(
      () => this.trpc.mealPlans.deleteMealPlan.mutate(input),
      () => {
        void this.syncService.syncMealPlans();
      },
      errorHandlers,
    );
  }

  deleteMealPlanItem(
    input: RouterInputs["mealPlans"]["deleteMealPlanItem"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["mealPlans"]["deleteMealPlanItem"] | undefined> {
    return this.executeMutation(
      () => this.trpc.mealPlans.deleteMealPlanItem.mutate(input),
      () => {
        void this.syncService.syncMealPlans();
      },
      errorHandlers,
    );
  }

  deleteMealPlanItems(
    input: RouterInputs["mealPlans"]["deleteMealPlanItems"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["mealPlans"]["deleteMealPlanItems"] | undefined> {
    return this.executeMutation(
      () => this.trpc.mealPlans.deleteMealPlanItems.mutate(input),
      () => {
        void this.syncService.syncMealPlans();
      },
      errorHandlers,
    );
  }

  detachMealPlan(
    input: RouterInputs["mealPlans"]["detachMealPlan"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["mealPlans"]["detachMealPlan"] | undefined> {
    return this.executeMutation(
      () => this.trpc.mealPlans.detachMealPlan.mutate(input),
      () => {
        void this.syncService.syncMealPlans();
      },
      errorHandlers,
    );
  }

  updateMealPlan(
    input: RouterInputs["mealPlans"]["updateMealPlan"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["mealPlans"]["updateMealPlan"] | undefined> {
    return this.executeMutation(
      () => this.trpc.mealPlans.updateMealPlan.mutate(input),
      () => {
        void this.syncService.syncMealPlans();
      },
      errorHandlers,
    );
  }

  updateMealPlanItem(
    input: RouterInputs["mealPlans"]["updateMealPlanItem"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["mealPlans"]["updateMealPlanItem"] | undefined> {
    return this.executeMutation(
      () => this.trpc.mealPlans.updateMealPlanItem.mutate(input),
      () => {
        void this.syncService.syncMealPlans();
      },
      errorHandlers,
    );
  }

  updateMealPlanItems(
    input: RouterInputs["mealPlans"]["updateMealPlanItems"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["mealPlans"]["updateMealPlanItems"] | undefined> {
    return this.executeMutation(
      () => this.trpc.mealPlans.updateMealPlanItems.mutate(input),
      () => {
        void this.syncService.syncMealPlans();
      },
      errorHandlers,
    );
  }
}
