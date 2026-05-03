import { Component, inject } from "@angular/core";
import { NavController, ModalController } from "@ionic/angular/standalone";

import { WebsocketService } from "~/services/websocket.service";
import { LoadingService } from "~/services/loading.service";
import { UtilService, RouteMap } from "~/services/util.service";
import { NewMealPlanModalPage } from "~/pages/meal-plan-components/new-meal-plan-modal/new-meal-plan-modal.page";
import { ServerActionsService } from "../../../services/server-actions.service";
import type { MealPlanSummary, UserPublic } from "@recipesage/prisma";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { NullStateComponent } from "../../../components/null-state/null-state.component";
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonIcon,
  IonLabel,
  IonBadge,
  IonFab,
  IonFabButton,
  IonSpinner,
} from "@ionic/angular/standalone";
import { add, calendar } from "ionicons/icons";
import { addIcons } from "ionicons";

@Component({
  standalone: true,
  selector: "page-meal-plans",
  templateUrl: "meal-plans.page.html",
  styleUrls: ["meal-plans.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    NullStateComponent,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonIcon,
    IonLabel,
    IonBadge,
    IonFab,
    IonFabButton,
    IonSpinner,
  ],
})
export class MealPlansPage {
  constructor() {
    addIcons({ add, calendar });
  }

  private navCtrl = inject(NavController);
  private modalCtrl = inject(ModalController);
  private serverActionsService = inject(ServerActionsService);
  private websocketService = inject(WebsocketService);
  private loadingService = inject(LoadingService);
  private utilService = inject(UtilService);

  me?: UserPublic;
  mealPlans?: MealPlanSummary[] = [];

  ionViewWillEnter() {
    const loading = this.loadingService.start();

    this.mealPlans = undefined;

    Promise.all([this.loadPlans(), this.loadMe()]).finally(() => {
      loading.dismiss();
    });

    this.websocketService.on("mealplan:updated", this.onWSEvent);
  }

  ionViewWillLeave() {
    this.websocketService.off("mealplan:updated", this.onWSEvent);
  }

  onWSEvent = () => {
    this.loadPlans();
  };

  async loadMe() {
    const me = await this.serverActionsService.users.getMe();
    if (!me) return;

    this.me = me;
  }

  async loadPlans() {
    const mealPlans = await this.serverActionsService.mealPlans.getMealPlans();
    if (!mealPlans) return;

    this.mealPlans = mealPlans.sort((a, b) => {
      return a.title.localeCompare(b.title);
    });
  }

  async newMealPlan() {
    const modal = await this.modalCtrl.create({
      component: NewMealPlanModalPage,
    });
    modal.present();
    modal.onDidDismiss().then(() => {
      this.loadPlans();
    });
  }

  openMealPlan(mealPlanId: string) {
    this.navCtrl.navigateForward(RouteMap.MealPlanPage.getPath(mealPlanId));
  }

  formatItemCreationDate(date: string | Date) {
    return this.utilService.formatDate(date, { now: true });
  }
}
