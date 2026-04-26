import { Component, Input, inject } from "@angular/core";
import { ModalController } from "@ionic/angular/standalone";
import fractionjs from "fraction.js";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonItem,
  IonLabel,
  IonButton,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonFooter,
} from "@ionic/angular/standalone";

export type UnitSystem = "original" | "metric" | "imperial";

@Component({
  standalone: true,
  selector: "scale-recipe",
  templateUrl: "scale-recipe.component.html",
  styleUrls: ["scale-recipe.component.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonItem,
    IonLabel,
    IonButton,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonFooter,
  ],
})
export class ScaleRecipeComponent {
  private modalCtrl = inject(ModalController);

  @Input() scale: string = "1";
  @Input() unitSystem: UnitSystem = "original";

  format(input: string) {
    // Support fractions
    const parsed = fractionjs(input).valueOf();

    // Trim long/repeating decimals
    let rounded = Number(parsed.toFixed(3));

    // Check for falsy values
    if (!rounded || rounded <= 0) rounded = 1;

    return rounded;
  }

  close() {
    this.modalCtrl.dismiss();
  }

  apply() {
    this.modalCtrl.dismiss({
      scale: this.format(this.scale),
      unitSystem: this.unitSystem,
    });
  }
}
