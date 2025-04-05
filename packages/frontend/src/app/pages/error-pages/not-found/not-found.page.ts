import { Component } from "@angular/core";
import { NavController } from "@ionic/angular";

import { RouteMap } from "~/services/util.service";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { NullStateComponent } from "../../../components/null-state/null-state.component";

@Component({
  selector: "page-not-found",
  templateUrl: "not-found.page.html",
  styleUrls: ["not-found.page.scss"],
  imports: [...SHARED_UI_IMPORTS, NullStateComponent],
})
export class NotFoundPage {
  constructor(private navCtrl: NavController) {}

  goToContact() {
    this.navCtrl.navigateForward(RouteMap.ContactPage.getPath());
  }

  goToHome() {
    this.navCtrl.navigateForward(RouteMap.HomePage.getPath("main"));
  }
}
