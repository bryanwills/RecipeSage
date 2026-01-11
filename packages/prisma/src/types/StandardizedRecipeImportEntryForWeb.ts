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
  };
  labels: string[];
  images: string[];
}
