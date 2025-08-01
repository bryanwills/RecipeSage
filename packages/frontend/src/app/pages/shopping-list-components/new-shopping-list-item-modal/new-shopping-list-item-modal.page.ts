import { Component, inject } from "@angular/core";
import { ModalController, ToastController } from "@ionic/angular";
import { RecipeService, ParsedIngredient } from "~/services/recipe.service";
import { LoadingService } from "~/services/loading.service";
import { UtilService } from "~/services/util.service";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { SelectIngredientsComponent } from "../../../components/select-ingredients/select-ingredients.component";
import { SelectRecipeComponent } from "../../../components/select-recipe/select-recipe.component";

@Component({
  selector: "page-new-shopping-list-item-modal",
  templateUrl: "new-shopping-list-item-modal.page.html",
  styleUrls: ["new-shopping-list-item-modal.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    SelectIngredientsComponent,
    SelectRecipeComponent,
  ],
})
export class NewShoppingListItemModalPage {
  modalCtrl = inject(ModalController);
  utilService = inject(UtilService);
  recipeService = inject(RecipeService);
  loadingService = inject(LoadingService);
  toastCtrl = inject(ToastController);

  inputType = "items";

  itemFields: any = [{}];

  selectedRecipe: any;
  selectedIngredients: ParsedIngredient[] = [];

  inputTypeChanged(event: any) {
    this.inputType = event.detail.value;
  }

  addOrRemoveTextFields() {
    if ((this.itemFields[this.itemFields.length - 1].title || "").length > 0) {
      this.itemFields.push({});
    }
  }

  isFormValid() {
    if (
      this.inputType === "recipe" &&
      this.selectedRecipe &&
      this.selectedRecipe.id
    ) {
      return this.selectedIngredients.length > 0;
    }
    if (this.inputType === "items") {
      for (const itemField of this.itemFields) {
        if (itemField.title) return true;
      }
    }
    return false;
  }

  save() {
    let items;
    if (this.inputType === "recipe") {
      items = this.selectedIngredients.map((ingredient) => ({
        title: ingredient.content,
        recipeId: this.selectedRecipe.id,
      }));
    } else {
      // Redundant for now. Kept for sterilization
      items = this.itemFields
        .filter((e: any) => {
          return (e.title || "").length > 0;
        })
        .map((e: any) => {
          return {
            title: e.title,
          };
        });
    }

    this.modalCtrl.dismiss({
      items,
    });
  }

  cancel() {
    this.modalCtrl.dismiss();
  }
}
