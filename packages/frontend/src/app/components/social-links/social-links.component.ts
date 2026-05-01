import { Component } from "@angular/core";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";
import { IonIcon, IonLabel, IonItem } from "@ionic/angular/standalone";
import {
  chatboxEllipses,
  logoFacebook,
  logoGithub,
  logoInstagram,
} from "ionicons/icons";
import { addIcons } from "ionicons";

@Component({
  standalone: true,
  selector: "social-links",
  templateUrl: "social-links.component.html",
  styleUrls: ["./social-links.component.scss"],
  imports: [...SHARED_UI_IMPORTS, IonIcon, IonLabel, IonItem],
})
export class SocialLinksComponent {
  constructor() {
    addIcons({ chatboxEllipses, logoFacebook, logoGithub, logoInstagram });
  }
}
