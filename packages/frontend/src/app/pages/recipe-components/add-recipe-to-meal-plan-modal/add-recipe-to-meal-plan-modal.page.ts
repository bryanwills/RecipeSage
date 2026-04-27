import { Component, Input, inject } from "@angular/core";
import { ToastController, ModalController } from "@ionic/angular/standalone";

import { LoadingService } from "~/services/loading.service";

import { NewMealPlanModalPage } from "~/pages/meal-plan-components/new-meal-plan-modal/new-meal-plan-modal.page";
import { TranslateService } from "@ngx-translate/core";
import { ServerActionsService } from "../../../services/server-actions.service";
import type { MealPlanItemSummary, MealPlanSummary } from "@recipesage/prisma";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { MealCalendarComponent } from "../../../components/meal-calendar/meal-calendar.component";
import { SelectMealComponent } from "../../../components/select-meal/select-meal.component";
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonItem,
  IonSelect,
  IonSelectOption,
  IonLabel,
  IonTextarea,
  IonFooter,
} from "@ionic/angular/standalone";
import { calendar, close } from "ionicons/icons";
import { addIcons } from "ionicons";

@Component({
  standalone: true,
  selector: "page-add-recipe-to-meal-plan-modal",
  templateUrl: "add-recipe-to-meal-plan-modal.page.html",
  styleUrls: ["add-recipe-to-meal-plan-modal.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    MealCalendarComponent,
    SelectMealComponent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonItem,
    IonSelect,
    IonSelectOption,
    IonLabel,
    IonTextarea,
    IonFooter,
  ],
})
export class AddRecipeToMealPlanModalPage {
  constructor() {
    addIcons({ calendar, close });
  }

  private translate = inject(TranslateService);
  private serverActionsService = inject(ServerActionsService);
  private loadingService = inject(LoadingService);
  private toastCtrl = inject(ToastController);
  private modalCtrl = inject(ModalController);

  @Input() recipe: any;

  mealPlans?: MealPlanSummary[];

  selectedMealPlan?: MealPlanSummary;
  selectedMealPlanItems?: MealPlanItemSummary[];
  meal?: string;
  notes = "";

  @Input() reference?: string;

  selectedDays: string[] = [];

  ionViewWillEnter() {
    const loading = this.loadingService.start();
    this.loadMealPlans().then(
      () => {
        loading.dismiss();
      },
      () => {
        loading.dismiss();
      },
    );
  }

  selectLastUsedMealPlan() {
    if (!this.mealPlans) return;

    const lastUsedMealPlanId = localStorage.getItem("lastUsedMealPlanId");
    const matchingPlans = this.mealPlans.filter(
      (mealPlan) => mealPlan.id === lastUsedMealPlanId,
    );
    if (matchingPlans.length > 0) {
      this.selectedMealPlan = matchingPlans[0];
      this.loadMealPlan(this.selectedMealPlan.id);
    } else if (this.mealPlans.length === 1) {
      this.selectedMealPlan = this.mealPlans[0];
      this.loadMealPlan(this.selectedMealPlan.id);
    }
  }

  saveLastUsedMealPlan() {
    if (!this.selectedMealPlan) return;

    localStorage.setItem("lastUsedMealPlanId", this.selectedMealPlan.id);
  }

  async loadMealPlans() {
    const mealPlans = await this.serverActionsService.mealPlans.getMealPlans();
    if (!mealPlans) return;

    this.mealPlans = mealPlans.sort((a, b) => a.title.localeCompare(b.title));

    this.selectLastUsedMealPlan();
  }

  async loadMealPlan(id: string) {
    const mealPlanItems =
      await this.serverActionsService.mealPlans.getMealPlanItems({
        mealPlanId: id,
      });

    if (!mealPlanItems) return;

    this.selectedMealPlanItems = mealPlanItems;
  }

  isFormValid() {
    if (!this.selectedMealPlan || !this.selectedDays[0]) return false;

    return this.meal && this.meal.length > 0;
  }

  async save() {
    if (!this.selectedMealPlan || !this.selectedDays[0] || !this.meal) return;

    const loading = this.loadingService.start();

    this.saveLastUsedMealPlan();

    const result =
      await this.serverActionsService.mealPlans.createMealPlanItems({
        mealPlanId: this.selectedMealPlan.id,
        items: [
          {
            title: this.recipe.title,
            recipeId: this.recipe.id,
            meal: this.meal as any, // TODO: Refine this type so that it aligns with Zod
            notes: this.notes,
            scheduledDate: this.selectedDays[0],
          },
        ],
      });
    loading.dismiss();

    if (result) this.modalCtrl.dismiss();
  }

  async createMealPlan() {
    const message = await this.translate
      .get("pages.addRecipeToMealPlanModal.newMealPlanSuccess")
      .toPromise();

    const modal = await this.modalCtrl.create({
      component: NewMealPlanModalPage,
    });
    modal.present();
    modal.onDidDismiss().then(({ data }) => {
      if (!data || !data.success) return;

      // Check for new meal plans
      this.loadMealPlans().then(async () => {
        if (this.mealPlans?.length === 1) {
          this.selectedMealPlan = this.mealPlans[0];
          this.loadMealPlan(this.mealPlans[0].id);
        } else {
          (
            await this.toastCtrl.create({
              message,
              duration: 6000,
            })
          ).present();
        }
      });
    });
  }

  cancel() {
    this.modalCtrl.dismiss();
  }
}
