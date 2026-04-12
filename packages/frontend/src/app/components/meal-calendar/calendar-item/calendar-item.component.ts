import { Component, Input } from "@angular/core";
import type { MealPlanItemSummary } from "@recipesage/prisma";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";

@Component({
  standalone: true,
  selector: "calendar-item",
  templateUrl: "calendar-item.component.html",
  styleUrls: ["./calendar-item.component.scss"],
  imports: [...SHARED_UI_IMPORTS],
})
export class CalendarItemComponent {
  @Input({
    required: true,
  })
  mealItem!: MealPlanItemSummary;

  constructor() {}
}
