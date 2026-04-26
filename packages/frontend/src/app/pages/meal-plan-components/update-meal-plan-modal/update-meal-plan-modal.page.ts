import { Component, Input, inject } from "@angular/core";
import { ModalController } from "@ionic/angular/standalone";

import { LoadingService } from "~/services/loading.service";
import { ServerActionsService } from "../../../services/server-actions.service";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { SelectCollaboratorsComponent } from "../../../components/select-collaborators/select-collaborators.component";
import { MealPlanMealOrderModalPage } from "../meal-plan-meal-order-modal/meal-plan-meal-order-modal.page";
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonItem,
  IonInput,
  IonLabel,
  IonFooter,
} from "@ionic/angular/standalone";
import { close, list, reorderThree } from "ionicons/icons";
import { addIcons } from "ionicons";

@Component({
  standalone: true,
  selector: "page-update-meal-plan-modal",
  templateUrl: "update-meal-plan-modal.page.html",
  styleUrls: ["update-meal-plan-modal.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    SelectCollaboratorsComponent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonItem,
    IonInput,
    IonLabel,
    IonFooter,
  ],
})
export class UpdateMealPlanModalPage {
  constructor() {
    addIcons({ close, list, reorderThree });
  }

  private modalCtrl = inject(ModalController);
  private loadingService = inject(LoadingService);
  private serverActionsService = inject(ServerActionsService);

  @Input({
    required: true,
  })
  mealPlanId!: string;

  mealPlanTitle = "";
  customMealOptions: string | null = null;
  selectedCollaboratorIds: string[] = [];
  loaded = false;

  ionViewWillEnter() {
    this.load();
  }

  async load() {
    const loading = this.loadingService.start();

    const result = await this.serverActionsService.mealPlans.getMealPlan({
      id: this.mealPlanId,
    });
    loading.dismiss();
    if (!result) return;

    this.mealPlanTitle = result.title;
    this.customMealOptions = result.customMealOptions;
    this.selectedCollaboratorIds = result.collaboratorUsers.map(
      (collaboratorUser) => collaboratorUser.user.id,
    );

    this.loaded = true;
  }

  async openCustomMealOptions() {
    const modal = await this.modalCtrl.create({
      component: MealPlanMealOrderModalPage,
      componentProps: {
        customMealOptions: this.customMealOptions || undefined,
      },
    });

    await modal.present();
    const { data } = await modal.onDidDismiss();

    if (data?.customMealOptions !== undefined) {
      this.customMealOptions = data.customMealOptions || null;
    }
  }

  async save() {
    const loading = this.loadingService.start();

    const result = await this.serverActionsService.mealPlans.updateMealPlan({
      id: this.mealPlanId,
      title: this.mealPlanTitle,
      collaboratorUserIds: this.selectedCollaboratorIds,
      customMealOptions: this.customMealOptions,
    });
    loading.dismiss();
    if (!result) return;

    this.modalCtrl.dismiss({
      success: true,
    });
  }

  cancel() {
    this.modalCtrl.dismiss({
      success: false,
    });
  }
}
