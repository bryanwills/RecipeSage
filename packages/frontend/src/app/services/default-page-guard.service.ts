import { Injectable, inject } from "@angular/core";
import { NavController } from "@ionic/angular";
import { UtilService, RouteMap } from "./util.service";
import { PreferencesService } from "./preferences.service";
import { GlobalPreferenceKey, StartPageOptions } from "@recipesage/util/shared";

@Injectable()
export class DefaultPageGuardService {
  private navCtrl = inject(NavController);
  private utilService = inject(UtilService);
  private preferencesService = inject(PreferencesService);

  canActivate() {
    const isLoggedIn = this.utilService.isLoggedIn();

    if (isLoggedIn) {
      const startPage =
        this.preferencesService.preferences[GlobalPreferenceKey.StartPage];

      let targetPath: string;
      switch (startPage) {
        case StartPageOptions.ManageLabels:
          targetPath = RouteMap.LabelsPage.getPath();
          break;
        case StartPageOptions.MealPlans:
          targetPath = RouteMap.MealPlansPage.getPath();
          break;
        case StartPageOptions.ShoppingLists:
          targetPath = RouteMap.ShoppingListsPage.getPath();
          break;
        case StartPageOptions.MyRecipes:
        default:
          targetPath = RouteMap.HomePage.getPath("main");
          break;
      }

      this.navCtrl.navigateRoot(targetPath);
    } else {
      this.navCtrl.navigateRoot(RouteMap.WelcomePage.getPath());
    }

    return false;
  }
}
