import { Component, inject, Input } from "@angular/core";
import { ModalController } from "@ionic/angular";

import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { ServerActionsService } from "../../../services/server-actions.service";

@Component({
  standalone: true,
  selector: "page-shopping-list-category-order-modal",
  templateUrl: "shopping-list-category-order-modal.page.html",
  styleUrls: ["shopping-list-category-order-modal.page.scss"],
  imports: [...SHARED_UI_IMPORTS],
})
export class ShoppingListCategoryOrderModalPage {
  private modalCtrl = inject(ModalController);
  private serverActionsService = inject(ServerActionsService);

  @Input({
    required: true,
  })
  shoppingListId!: string;

  @Input({
    required: true,
  })
  categoryOrder: string | undefined;

  async save() {
    await this.serverActionsService.shoppingLists.updateShoppingList({
      id: this.shoppingListId,
      categoryOrder: this.categoryOrder,
    });
    this.close();
  }

  close() {
    this.modalCtrl.dismiss();
  }
}
