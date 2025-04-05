import { Component } from "@angular/core";
import { NavController } from "@ionic/angular";

import { RouteMap } from "~/services/util.service";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { SocialLinksComponent } from "../../../components/social-links/social-links.component";

@Component({
  selector: "page-about",
  templateUrl: "about.page.html",
  styleUrls: ["about.page.scss"],
  imports: [...SHARED_UI_IMPORTS, SocialLinksComponent],
})
export class AboutPage {
  constructor(public navCtrl: NavController) {}

  goToAboutDetails() {
    this.navCtrl.navigateForward(RouteMap.AboutDetailsPage.getPath());
  }

  goToContact() {
    this.navCtrl.navigateForward(RouteMap.ContactPage.getPath());
  }

  goToContribute() {
    this.navCtrl.navigateForward(RouteMap.ContributePage.getPath());
  }

  goToReleaseNotes() {
    window.open("https://docs.recipesage.com/docs/release-notes");
  }

  goToUserGuide() {
    window.open("https://docs.recipesage.com");
  }

  goToLegal() {
    this.navCtrl.navigateForward(RouteMap.LegalPage.getPath());
  }
}
