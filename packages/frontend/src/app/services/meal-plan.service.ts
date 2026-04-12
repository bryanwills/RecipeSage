import { Injectable } from "@angular/core";
import { getBase } from "../utils/getBase";

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
