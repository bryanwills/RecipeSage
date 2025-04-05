import { Component, Input } from "@angular/core";
import { PopoverController } from "@ionic/angular";
import { PreferencesService } from "~/services/preferences.service";
import { RecipeDetailsPreferenceKey } from "@recipesage/util/shared";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";

@Component({
  selector: "page-edit-recipe-popover",
  templateUrl: "edit-recipe-popover.page.html",
  styleUrls: ["edit-recipe-popover.page.scss"],
  imports: [...SHARED_UI_IMPORTS],
})
export class EditRecipePopoverPage {
  preferences = this.preferencesService.preferences;
  preferenceKeys = RecipeDetailsPreferenceKey;

  @Input({
    required: true,
  })
  canAddImages!: boolean;
  @Input({
    required: true,
  })
  addImageByUrlPrompt!: () => void;

  constructor(
    private preferencesService: PreferencesService,
    private popoverCtrl: PopoverController,
  ) {}

  savePreferences() {
    this.preferencesService.save();
  }

  dismiss() {
    this.popoverCtrl.dismiss();
  }
}
