import { MealPlanService } from "~/services/meal-plan.service";
import { Component, Input } from "@angular/core";
import { ModalController } from "@ionic/angular";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { CopyWithWebshareComponent } from "../../../components/copy-with-webshare/copy-with-webshare.component";

@Component({
  selector: "page-share-meal-plan-modal",
  templateUrl: "share-meal-plan-modal.page.html",
  styleUrls: ["share-meal-plan-modal.page.scss"],
  imports: [...SHARED_UI_IMPORTS, CopyWithWebshareComponent],
})
export class ShareMealPlanModalPage {
  @Input({
    required: true,
  })
  mealPlanId!: string;

  icalURL = "";

  constructor(
    private modalCtrl: ModalController,
    private mealPlanService: MealPlanService,
  ) {}

  ionViewWillEnter() {
    this.icalURL = this.mealPlanService.getICalUrl(this.mealPlanId);
  }

  close() {
    this.modalCtrl.dismiss();
  }
}
