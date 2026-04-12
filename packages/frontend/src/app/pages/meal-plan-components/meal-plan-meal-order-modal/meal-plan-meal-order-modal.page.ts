import { Component, inject, Input, type OnInit } from "@angular/core";
import { ModalController } from "@ionic/angular";
import {
  DEFAULT_MEALS,
  DEFAULT_MEAL_COLORS,
  capitalizeEachWord,
  parseCustomMealOptions,
} from "@recipesage/util/shared";

import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { ColorPickerComponent } from "../../../components/color-picker/color-picker.component";

interface MealOptionEntry {
  name: string;
  color: string | null;
  isDefault: boolean;
}

@Component({
  standalone: true,
  selector: "page-meal-plan-meal-order-modal",
  templateUrl: "meal-plan-meal-order-modal.page.html",
  styleUrls: ["meal-plan-meal-order-modal.page.scss"],
  imports: [...SHARED_UI_IMPORTS, ColorPickerComponent],
})
export class MealPlanMealOrderModalPage implements OnInit {
  private modalCtrl = inject(ModalController);

  @Input()
  customMealOptions: string | undefined;

  entries: MealOptionEntry[] = [{ name: "", color: null, isDefault: false }];
  openColorPickerIndex: number | null = null;

  ngOnInit() {
    const parsed = parseCustomMealOptions(this.customMealOptions);
    if (parsed.length > 0) {
      this.entries = parsed.map((e) => ({
        name: e.name,
        color: e.color || DEFAULT_MEAL_COLORS[e.name.toLowerCase()] || null,
        isDefault: DEFAULT_MEALS.includes(e.name.toLowerCase()),
      }));
    } else {
      this.entries = DEFAULT_MEALS.map((meal) => ({
        name: capitalizeEachWord(meal),
        color: DEFAULT_MEAL_COLORS[meal],
        isDefault: true,
      }));
    }
    this.entries.push({ name: "", color: null, isDefault: false });
  }

  onEntryInput(index: number) {
    if (index === this.entries.length - 1 && this.entries[index].name.trim()) {
      this.entries.push({ name: "", color: null, isDefault: false });
    }
  }

  removeEntry(index: number) {
    this.entries.splice(index, 1);
    if (this.openColorPickerIndex === index) {
      this.openColorPickerIndex = null;
    } else if (
      this.openColorPickerIndex !== null &&
      this.openColorPickerIndex > index
    ) {
      this.openColorPickerIndex--;
    }
  }

  toggleColorPicker(index: number) {
    if (this.openColorPickerIndex === index) {
      this.openColorPickerIndex = null;
    } else {
      this.openColorPickerIndex = index;
    }
  }

  onColorChange(index: number, color: string | null) {
    this.entries[index].color = color;
  }

  save() {
    const lines = this.entries
      .filter((e) => e.name.trim())
      .map((e) => {
        const name = e.name.trim();
        if (e.color) return `${e.color} ${name}`;
        return name;
      });

    this.modalCtrl.dismiss({
      customMealOptions: lines.length > 0 ? lines.join("\n") : null,
    });
  }

  close() {
    this.modalCtrl.dismiss();
  }
}
