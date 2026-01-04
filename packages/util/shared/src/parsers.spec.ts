import { describe, it, expect } from "vitest";
import {
  getMeasurementsForIngredient,
  getTitleForIngredient,
  stripIngredient,
  parseIngredients,
  parseInstructions,
  parseNotes,
  isRtlText,
} from "./parsers";

describe("parsers", () => {
  describe("getMeasurementsForIngredient", () => {
    describe("basic measurements", () => {
      it("extracts measurement with unit", () => {
        const result = getMeasurementsForIngredient("2 cups flour");
        expect(result).toEqual(["2 cups"]);
      });

      it("extracts measurement without unit", () => {
        const result = getMeasurementsForIngredient("3 eggs");
        expect(result).toEqual(["3"]);
      });

      it("returns empty array when no measurements found", () => {
        const result = getMeasurementsForIngredient("salt to taste");
        expect(result).toEqual([]);
      });
    });

    describe("multipart measurements", () => {
      it("extracts measurements separated by plus", () => {
        const result = getMeasurementsForIngredient(
          "1 cup + 2 tablespoons sugar",
        );
        expect(result).toEqual(["1 cup", "2 tablespoons"]);
      });

      it("extracts measurements separated by or", () => {
        const result = getMeasurementsForIngredient("1 cup or 250ml milk");
        expect(result).toEqual(["1 cup", "250ml"]);
      });

      it("extracts measurements separated by plus keyword", () => {
        const result = getMeasurementsForIngredient(
          "1 cup plus 2 tablespoons flour",
        );
        expect(result).toEqual(["1 cup", "2 tablespoons"]);
      });
    });

    describe("special formats", () => {
      it("handles unicode fractions", () => {
        const result = getMeasurementsForIngredient("½ cup milk");
        expect(result).toEqual(["1/2 cup"]);
      });

      it("handles range measurements", () => {
        const result = getMeasurementsForIngredient("1-2 teaspoons salt");
        expect(result).toEqual(["1-2 teaspoons"]);
      });

      it("handles range with to keyword", () => {
        const result = getMeasurementsForIngredient(
          "3 to 4 tablespoons butter",
        );
        expect(result).toEqual(["3 to 4 tablespoons"]);
      });

      it("strips notes in parentheses", () => {
        const result = getMeasurementsForIngredient("2 cups flour (sifted)");
        expect(result).toEqual(["2 cups"]);
      });
    });
  });

  describe("getTitleForIngredient", () => {
    describe("measurement removal", () => {
      it("removes measurement but keeps descriptive text", () => {
        const result = getTitleForIngredient("3 cups chopped apples");
        expect(result).toBe("chopped apples");
      });

      it("handles ingredient with no measurements", () => {
        const result = getTitleForIngredient("fresh basil");
        expect(result).toBe("fresh basil");
      });
    });

    describe("multipart measurements", () => {
      it("removes empty parts and their delimiters", () => {
        const result = getTitleForIngredient("1 cup + 2 tablespoons flour");
        expect(result).toBe("flour");
      });

      it("removes empty parts with or delimiter", () => {
        const result = getTitleForIngredient("1 cup or 250ml milk");
        expect(result).toBe("milk");
      });

      it("preserves delimiter when both parts have ingredients", () => {
        const result = getTitleForIngredient(
          "1 cup apples + 2 tablespoons sugar",
        );
        expect(result).toBe("apples + sugar");
      });
    });

    describe("notes handling", () => {
      it("removes parenthetical notes", () => {
        const result = getTitleForIngredient("2 cups apples (peeled)");
        expect(result).toBe("apples");
      });
    });
  });

  describe("stripIngredient", () => {
    describe("complete stripping", () => {
      it("removes measurements, units, and filler words", () => {
        const result = stripIngredient("3 cups chopped apples");
        expect(result).toBe("apples");
      });

      it("removes parenthetical notes", () => {
        const result = stripIngredient("2 apples (peeled)");
        expect(result).toBe("apples");
      });

      it("removes trailing commas", () => {
        const result = stripIngredient("2 cups flour,");
        expect(result).toBe("flour");
      });
    });

    describe("filler words", () => {
      it("removes filler words at start", () => {
        const result = stripIngredient("chopped onions");
        expect(result).toBe("onions");
      });

      it("removes filler words at end", () => {
        const result = stripIngredient("apples chopped");
        expect(result).toBe("apples");
      });

      it("removes multiple filler words", () => {
        const result = stripIngredient("2 cups chopped minced garlic");
        expect(result).toBe("garlic");
      });
    });

    describe("unicode fractions", () => {
      it("handles unicode fractions", () => {
        const result = stripIngredient("½ cup sugar");
        expect(result).toBe("sugar");
      });
    });
  });

  describe("parseIngredients", () => {
    describe("basic parsing", () => {
      it("parses single ingredient with scale 1", () => {
        const result = parseIngredients("2 cups flour", 1);
        expect(result).toHaveLength(1);
        expect(result[0].content).toBe("2 cups flour");
        expect(result[0].originalContent).toBe("2 cups flour");
        expect(result[0].isHeader).toBe(false);
        expect(result[0].complete).toBe(false);
      });

      it("returns empty array for empty input", () => {
        const result = parseIngredients("", 1);
        expect(result).toEqual([]);
      });

      it("parses multiple ingredients", () => {
        const result = parseIngredients("2 cups flour\n3 eggs\n1 cup milk", 1);
        expect(result).toHaveLength(3);
      });
    });

    describe("scaling", () => {
      it("scales measurements by factor of 2", () => {
        const result = parseIngredients("2 cups flour", 2);
        expect(result[0].content).toBe("4 cups flour");
      });

      it("scales fractional measurements", () => {
        const result = parseIngredients("1/2 cup sugar", 2);
        expect(result[0].content).toBe("1 cup sugar");
      });

      it("scales range measurements", () => {
        const result = parseIngredients("1-2 teaspoons salt", 2);
        expect(result[0].content).toBe("2-4 teaspoons salt");
      });

      it("scales unicode fractions", () => {
        const result = parseIngredients("½ cup butter", 2);
        expect(result[0].content).toBe("1 cup butter");
      });
    });

    describe("headers", () => {
      it("detects headers in brackets", () => {
        const result = parseIngredients("[Sauce]\n2 cups tomato", 1);
        expect(result[0].isHeader).toBe(true);
        expect(result[0].content).toBe("Sauce");
        expect(result[1].isHeader).toBe(false);
      });

      it("formats headers with bold tag in html", () => {
        const result = parseIngredients("[Topping]", 1);
        expect(result[0].htmlContent).toBe(
          '<b class="sectionHeader">Topping</b>',
        );
      });
    });

    describe("multipart measurements", () => {
      it("preserves plus delimiter", () => {
        const result = parseIngredients("1 cup + 2 tablespoons flour", 1);
        expect(result[0].content).toBe("1 cup + 2 tablespoons flour");
      });

      it("scales multipart measurements", () => {
        const result = parseIngredients("1 cup + 2 tablespoons flour", 2);
        expect(result[0].content).toBe("2 cup + 4 tablespoons flour");
      });
    });

    describe("line continuations", () => {
      it("converts escaped newlines to actual newlines but not independent steps", () => {
        const result = parseIngredients("2 cups flour\\\nall-purpose", 1);
        expect(result[0].content).toBe("2 cups flour\nall-purpose");
      });

      it("converts escaped newlines to br tags in html but not independent steps", () => {
        const result = parseIngredients("2 cups flour\\\nall-purpose", 1);
        expect(result[0].htmlContent).toContain("<br>");
      });
    });

    describe("html output", () => {
      it("wraps measurements in bold tags", () => {
        const result = parseIngredients("2 cups flour", 1);
        expect(result[0].htmlContent).toContain(
          '<b class="ingredientMeasurement">2</b>',
        );
      });
    });

    describe("rtl text", () => {
      it("detects rtl text", () => {
        const result = parseIngredients("2 كوب دقيق", 1);
        expect(result[0].isRtl).toBe(true);
      });

      it("detects ltr text", () => {
        const result = parseIngredients("2 cups flour", 1);
        expect(result[0].isRtl).toBe(false);
      });
    });
  });

  describe("parseInstructions", () => {
    describe("basic parsing", () => {
      it("parses single instruction with step counting", () => {
        const result = parseInstructions("Mix the ingredients", 1);
        expect(result).toHaveLength(1);
        expect(result[0].content).toBe("Mix the ingredients");
        expect(result[0].count).toBe(1);
        expect(result[0].isHeader).toBe(false);
        expect(result[0].complete).toBe(false);
      });

      it("increments step count for multiple instructions", () => {
        const result = parseInstructions("Mix flour\nAdd eggs\nBake", 1);
        expect(result).toHaveLength(3);
        expect(result[0].count).toBe(1);
        expect(result[1].count).toBe(2);
        expect(result[2].count).toBe(3);
      });

      it("filters out empty lines", () => {
        const result = parseInstructions("Mix flour\n\nAdd eggs", 1);
        expect(result).toHaveLength(2);
      });
    });

    describe("headers", () => {
      it("detects headers in brackets", () => {
        const result = parseInstructions("[Preparation]\nMix ingredients", 1);
        expect(result[0].isHeader).toBe(true);
        expect(result[0].content).toBe("Preparation");
        expect(result[0].count).toBe(0);
      });

      it("resets step count after header", () => {
        const result = parseInstructions(
          "Mix\nStir\n[Baking]\nPreheat\nBake",
          1,
        );
        expect(result[0].count).toBe(1);
        expect(result[1].count).toBe(2);
        expect(result[2].isHeader).toBe(true);
        expect(result[3].count).toBe(1);
        expect(result[4].count).toBe(2);
      });

      it("formats headers with bold tag in html", () => {
        const result = parseInstructions("[Cooking]", 1);
        expect(result[0].htmlContent).toBe(
          '<b class="sectionHeader">Cooking</b>',
        );
      });
    });

    describe("scaling with curly braces", () => {
      it("scales numbers in curly braces", () => {
        const result = parseInstructions("Add {2} cups flour", 2);
        expect(result[0].content).toBe("Add 4 cups flour");
      });

      it("scales fractions in curly braces", () => {
        const result = parseInstructions("Add {1/2} cup sugar", 2);
        expect(result[0].content).toBe("Add 1 cup sugar");
      });

      it("wraps scaled measurements in bold tags for html", () => {
        const result = parseInstructions("Add {2} cups flour", 2);
        expect(result[0].htmlContent).toContain(
          '<b class="instructionMeasurement">4</b>',
        );
      });

      it("leaves non-numeric curly braces unchanged", () => {
        const result = parseInstructions("Add {variable} to mix", 1);
        expect(result[0].content).toBe("Add {variable} to mix");
      });
    });

    describe("line continuations", () => {
      it("converts escaped newlines to actual newlines but not independent steps", () => {
        const result = parseInstructions("Mix flour and\\\nsugar together", 1);
        expect(result[0].content).toBe("Mix flour and\nsugar together");
      });

      it("converts escaped newlines to br tags in html but not independent steps", () => {
        const result = parseInstructions("Mix flour and\\\nsugar together", 1);
        expect(result[0].htmlContent).toContain("<br>");
      });
    });

    describe("rtl text", () => {
      it("detects rtl text", () => {
        const result = parseInstructions("اخلط المكونات", 1);
        expect(result[0].isRtl).toBe(true);
      });

      it("detects ltr text", () => {
        const result = parseInstructions("Mix ingredients", 1);
        expect(result[0].isRtl).toBe(false);
      });
    });
  });

  describe("parseNotes", () => {
    describe("basic parsing", () => {
      it("parses single note", () => {
        const result = parseNotes("Store in refrigerator");
        expect(result).toHaveLength(1);
        expect(result[0].content).toBe("Store in refrigerator");
        expect(result[0].isHeader).toBe(false);
      });

      it("parses multiple notes", () => {
        const result = parseNotes("Best served cold\nKeeps for 3 days");
        expect(result).toHaveLength(2);
      });
    });

    describe("headers", () => {
      it("detects headers in brackets", () => {
        const result = parseNotes("[Storage Tips]\nKeep refrigerated");
        expect(result[0].isHeader).toBe(true);
        expect(result[0].content).toBe("Storage Tips");
        expect(result[1].isHeader).toBe(false);
      });

      it("formats headers with bold tag in html", () => {
        const result = parseNotes("[Tips]");
        expect(result[0].htmlContent).toBe('<b class="sectionHeader">Tips</b>');
      });
    });

    describe("line continuations", () => {
      it("converts escaped newlines to actual newlines", () => {
        const result = parseNotes("Store in\\\nrefrigerator");
        expect(result[0].content).toBe("Store in\nrefrigerator");
      });

      it("converts escaped newlines to br tags in html", () => {
        const result = parseNotes("Store in\\\nrefrigerator");
        expect(result[0].htmlContent).toContain("<br>");
      });
    });

    describe("rtl text", () => {
      it("detects rtl text", () => {
        const result = parseNotes("احفظ في الثلاجة");
        expect(result[0].isRtl).toBe(true);
      });

      it("detects ltr text", () => {
        const result = parseNotes("Keep refrigerated");
        expect(result[0].isRtl).toBe(false);
      });
    });
  });

  describe("isRtlText", () => {
    describe("language detection", () => {
      it("returns false for english text", () => {
        const result = isRtlText("Hello world");
        expect(result).toBe(false);
      });

      it("returns true for arabic text", () => {
        const result = isRtlText("مرحبا بالعالم");
        expect(result).toBe(true);
      });

      it("returns true for hebrew text", () => {
        const result = isRtlText("שלום עולם");
        expect(result).toBe(true);
      });
    });

    describe("mixed text", () => {
      it("returns result based on character majority when checking whole text", () => {
        const result = isRtlText("Hi مرحبا بالعالم الجميل", false);
        expect(result).toBe(true);
      });
    });

    describe("onlyFirstWord parameter", () => {
      it("checks only first word when true", () => {
        const result = isRtlText("مرحبا Hello world", true);
        expect(result).toBe(true);
      });

      it("checks entire text when false", () => {
        const result = isRtlText("مرحبا Hello world everyone", false);
        expect(result).toBe(false);
      });

      it("defaults to true when not specified", () => {
        const result = isRtlText("مرحبا Hello world");
        expect(result).toBe(true);
      });
    });
  });
});
