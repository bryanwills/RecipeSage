import { Injectable } from "@angular/core";
import { getBase } from "../utils/getBase";

export enum MealName {
  Breakfast = "breakfast",
  Lunch = "lunch",
  Dinner = "dinner",
  Snacks = "snacks",
  Other = "other",
}

@Injectable({
  providedIn: "root",
})
/**
 * @deprecated
 */
export class MealPlanService {
  getICalUrl(mealPlanId: string) {
    return `${getBase()}mealPlans/${mealPlanId}/ical`;
  }
}
