import { Component, Input, Output, EventEmitter, inject } from "@angular/core";
import { LoadingService } from "~/services/loading.service";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";
import { TRPCService } from "../../services/trpc.service";
import type {
  RecipeSummary,
  RecipeSummaryLite,
  UserPublic,
} from "@recipesage/prisma";

@Component({
  standalone: true,
  selector: "select-recipe",
  templateUrl: "select-recipe.component.html",
  styleUrls: ["./select-recipe.component.scss"],
  imports: [...SHARED_UI_IMPORTS],
})
export class SelectRecipeComponent {
  private loadingService = inject(LoadingService);
  private trpcService = inject(TRPCService);

  myProfile?: UserPublic;
  friendsById?: {
    [key: string]: UserPublic;
  };

  searchTimeout?: NodeJS.Timeout;
  searchText = "";
  searching = false;
  PAUSE_BEFORE_SEARCH = 500;

  @Input() includeAllFriends = false;
  @Input() enableSelectedState = true;

  _selectedRecipe?: RecipeSummary;
  @Input()
  get selectedRecipe() {
    return this._selectedRecipe;
  }

  set selectedRecipe(val: RecipeSummary | undefined) {
    this._selectedRecipe = val;
    this.selectedRecipeChange.emit(this._selectedRecipe);
  }

  @Output() selectedRecipeChange = new EventEmitter<RecipeSummary>();

  recipes: RecipeSummaryLite[] = [];

  constructor() {
    this.fetchMyProfile();
    this.fetchFriends();
  }

  async fetchMyProfile() {
    const response = await this.trpcService.handle(
      this.trpcService.trpc.users.getMe.query(),
      {
        401: () => {},
      },
    );
    if (!response) return;

    this.myProfile = response;
  }

  async fetchFriends() {
    const response = await this.trpcService.handle(
      this.trpcService.trpc.users.getMyFriends.query(),
      {
        401: () => {},
      },
    );
    if (!response) return;

    this.friendsById = response.friends.reduce(
      (acc, friendEntry) => {
        acc[friendEntry.id] = friendEntry;
        return acc;
      },
      {} as Record<string, UserPublic>,
    );
  }

  async search(text: string) {
    const loading = this.loadingService.start();

    const response = await this.trpcService.handle(
      this.trpcService.trpc.recipes.searchRecipes.query({
        searchTerm: text,
        folder: "main",
        includeAllFriends: this.includeAllFriends,
      }),
    );
    loading.dismiss();
    this.searching = false;

    if (!response) return;

    this.recipes = response.recipes;
  }

  onSearchInputChange() {
    this.recipes = [];
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    if (!this.searchText) return;

    this.searching = true;

    this.searchTimeout = setTimeout(() => {
      this.search(this.searchText);
    }, this.PAUSE_BEFORE_SEARCH);
  }

  async selectRecipe(recipe: RecipeSummaryLite) {
    this.searchText = "";

    const response = await this.trpcService.handle(
      this.trpcService.trpc.recipes.getRecipe.query({
        id: recipe.id,
      }),
    );
    if (!response) return;

    if (this.enableSelectedState) {
      this.selectedRecipe = response;
    } else {
      this.selectedRecipeChange.emit(response);
    }
  }

  recipeTrackBy(index: number, recipe: RecipeSummary | RecipeSummaryLite) {
    return recipe.id;
  }
}
