import { Component, inject } from "@angular/core";
import {
  NavController,
  ModalController,
  ToastController,
} from "@ionic/angular";

import { MealPlanService } from "~/services/meal-plan.service";
import { WebsocketService } from "~/services/websocket.service";
import { LoadingService } from "~/services/loading.service";
import { UtilService, RouteMap } from "~/services/util.service";
import { NewMealPlanModalPage } from "~/pages/meal-plan-components/new-meal-plan-modal/new-meal-plan-modal.page";
import { TRPCService } from "../../../services/trpc.service";
import type { MealPlanSummary, UserPublic } from "@recipesage/prisma";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { NullStateComponent } from "../../../components/null-state/null-state.component";

@Component({
  selector: "page-meal-plans",
  templateUrl: "meal-plans.page.html",
  styleUrls: ["meal-plans.page.scss"],
  imports: [...SHARED_UI_IMPORTS, NullStateComponent],
})
export class MealPlansPage {
  private navCtrl = inject(NavController);
  private modalCtrl = inject(ModalController);
  private trpcService = inject(TRPCService);
  private websocketService = inject(WebsocketService);
  private loadingService = inject(LoadingService);
  private utilService = inject(UtilService);

  me?: UserPublic;
  mealPlans?: MealPlanSummary[] = [];

  constructor() {
    this.websocketService.register(
      "mealPlan:received",
      () => {
        this.loadPlans();
      },
      this,
    );

    this.websocketService.register(
      "mealPlan:removed",
      () => {
        this.loadPlans();
      },
      this,
    );
  }

  ionViewDidLoad() {}

  ionViewWillEnter() {
    const loading = this.loadingService.start();

    this.mealPlans = undefined;

    Promise.all([this.loadPlans(), this.loadMe()]).finally(() => {
      loading.dismiss();
    });
  }

  refresh(refresher: any) {
    this.loadPlans().then(
      () => {
        refresher.target.complete();
      },
      () => {
        refresher.target.complete();
      },
    );
  }

  async loadMe() {
    const me = await this.trpcService.handle(
      this.trpcService.trpc.users.getMe.query(),
    );
    if (!me) return;

    this.me = me;
  }

  async loadPlans() {
    const mealPlans = await this.trpcService.handle(
      this.trpcService.trpc.mealPlans.getMealPlans.query(),
    );
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
