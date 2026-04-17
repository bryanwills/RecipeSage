export interface StandardizedRecipeImportEntryForWeb {
  recipe: {
    title: string;
    description?: string;
    yield?: string;
    activeTime?: string;
    totalTime?: string;
    source?: string;
    url?: string;
    notes?: string;
    ingredients?: string;
    instructions?: string;
    folder?: string;
    rating?: number;
    nutritionInfo?: string;
    nutritionCalories?: number | null;
    nutritionTotalFat?: number | null;
    nutritionSaturatedFat?: number | null;
    nutritionTransFat?: number | null;
    nutritionCholesterol?: number | null;
    nutritionSodium?: number | null;
    nutritionTotalCarbs?: number | null;
    nutritionDietaryFiber?: number | null;
    nutritionTotalSugars?: number | null;
    nutritionAddedSugars?: number | null;
    nutritionProtein?: number | null;
    nutritionVitaminD?: number | null;
    nutritionCalcium?: number | null;
    nutritionIron?: number | null;
    nutritionPotassium?: number | null;
  };
  labels: string[];
  images: string[];
}
