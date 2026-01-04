import _FractionJS from "fraction.js";
import FractionJSModule from "fraction.js";
import { unitNames } from "./units";

// Fix for https://github.com/rawify/Fraction.js/issues/72
const FractionJS =
  _FractionJS || (FractionJSModule as unknown as typeof _FractionJS);

// Feature detection for negative lookahead support (needed for older Safari/browsers)
let supportsNegativeLookahead = true;
try {
  new RegExp("(?<!\\\\)\\n");
} catch (_e) {
  supportsNegativeLookahead = false;
}

// Create line split regex based on browser support
// With support: Preserve backslash-newline continuations
// Without support: Fallback splits on all newlines (breaks line continuations but works on older browsers)
const lineSplitRegex = supportsNegativeLookahead ? /(?<!\\)\r?\n/ : /\r?\n/;

const fractionMatchers = {
  // Regex & replacement value by charcode
  189: [/ ?\u00BD/g, " 1/2"], // ½  \u00BD;
  8531: [/ ?\u2153/g, " 1/3"], // ⅓  \u2153;
  8532: [/ ?\u2154/g, " 2/3"], // ⅔  \u2154;
  188: [/ ?\u00BC/g, " 1/4"], // ¼  \u00BC;
  190: [/ ?\u00BE/g, " 3/4"], // ¾  \u00BE;
  8533: [/ ?\u2155/g, " 1/5"], // ⅕  \u2155;
  8534: [/ ?\u2156/g, " 2/5"], // ⅖  \u2156;
  8535: [/ ?\u2157/g, " 3/5"], // ⅗  \u2157;
  8536: [/ ?\u2158/g, " 4/5"], // ⅘  \u2158;
  8537: [/ ?\u2159/g, " 1/6"], // ⅙  \u2159;
  8538: [/ ?\u215A/g, " 5/6"], // ⅚  \u215A;
  8528: [/ ?\u2150/g, " 1/7"], // ⅐  \u2150;
  8539: [/ ?\u215B/g, " 1/8"], // ⅛  \u215B;
  8540: [/ ?\u215C/g, " 3/8"], // ⅜  \u215C;
  8541: [/ ?\u215D/g, " 5/8"], // ⅝  \u215D;
  8542: [/ ?\u215E/g, " 7/8"], // ⅞  \u215E;
  8529: [/ ?\u2151/g, " 1/9"], // ⅑  \u2151;
  8530: [/ ?\u2152/g, " 1/10"], // ⅒ \u2152;
} as { [key: number]: [RegExp, string] };

const fractionMatchRegexp = new RegExp(
  Object.values(fractionMatchers)
    .map((matcher) => matcher[0].source)
    .join("|"),
  "g",
);

const replaceFractionsInText = (rawText: string): string => {
  return rawText.replace(fractionMatchRegexp, (match) => {
    const matcher = fractionMatchers[match.trim().charCodeAt(0)];
    return matcher ? matcher[1] : match; // Fallback on original value if not found
  });
};

// Convert backslash-newline to <br> or \n based on output format
const convertEscapedLineContinuations = (
  text: string,
  htmlOutput: boolean,
): string => {
  const replacement = htmlOutput ? "<br>" : "\n";
  return text.replace(/\\[\r]?\n/g, replacement);
};

// Strip newlines for shopping list grouping
const stripNewlines = (text: string): string => {
  return text.replace(/\n/g, " ");
};

// Starts with [, anything inbetween, ends with ]
const headerRegexp = /^\[.*\]$/;

const multipartQuantifierRegexp = / \+ | plus | or /;

const measurementRegexp =
  /((\d+ )?\d+([/.]\d+)?((-)|( to )|( - ))(\d+ )?\d+([/.]\d+)?)|((\d+ )?\d+[/.]\d+)|\d+/;
// TODO: Replace measurementRegexp with this:
// var measurementRegexp = /(( ?\d+([\/\.]\d+)?){1,2})(((-)|( to )|( - ))(( ?\d+([\/\.]\d+)?){1,2}))?/; // Simpler version of above, but has a bug where it removes some spacing

const quantityRegexp = new RegExp(
  `(${unitNames.join("|").replace(/[.*+?^${}()[\]\\]/g, "\\$&")})s?(\\.)?( |$)`,
);

const measurementQuantityRegExp = new RegExp(
  `^(${measurementRegexp.source}) *(${quantityRegexp.source})?`,
); // Should always be used with 'i' flag

/**
 * This removes critical information from the context of an ingredient, and
 * should only be used in a situation where you want to remove anything but, say, an ingredient title.
 */
const fillerWordsRegexp =
  /\b(halved|cored|cubed|peeled|minced|grated|shredded|crushed|roasted|toasted|melted|chilled|whipped|diced|trimmed|rinsed|chopped fine|chopped course|chopped|chilled|patted dry|heaped|about|approximately|approx|(slice(s|d)?)|blended|tossed)\b/;

const notesRegexp = /\(.*?\)/;

const stripNotes = (ingredient: string): string => {
  return ingredient.replace(new RegExp(notesRegexp, "g"), "").trim();
};

export const getMeasurementsForIngredient = (ingredient: string): string[] => {
  ingredient = stripNewlines(ingredient);
  const strippedIngredient = replaceFractionsInText(ingredient);

  return strippedIngredient
    .split(multipartQuantifierRegexp)
    .map((ingredientPart) => {
      const measurementMatch = stripNotes(ingredientPart).match(
        new RegExp(measurementQuantityRegExp.source, "i"),
      );

      if (measurementMatch) return measurementMatch[0].trim();
      return null;
    })
    .filter((measurement): measurement is string => !!measurement);
};

/**
 * A little older, consider seeing if stripIngredient works for your use-case instead
 */
export const getTitleForIngredient = (ingredient: string): string => {
  ingredient = stripNewlines(ingredient);
  const strippedIngredient = replaceFractionsInText(ingredient);

  const ingredientPartDelimiters = strippedIngredient.match(
    new RegExp(multipartQuantifierRegexp, "ig"),
  );

  return strippedIngredient
    .split(multipartQuantifierRegexp)
    .map((ingredientPart) => {
      return stripNotes(ingredientPart).replace(
        new RegExp(measurementQuantityRegExp, "i"),
        "",
      );
    })
    .reduce(
      (acc, ingredientPart, idx) =>
        acc +
        ingredientPart +
        (ingredientPartDelimiters ? ingredientPartDelimiters[idx] || "" : ""),
      "",
    )
    .trim();
};

/**
 * As best we can, removes anything but the singular ingredient name itself.
 * 3 apples, blended => apples
 */
export const stripIngredient = (ingredient: string): string => {
  ingredient = stripNewlines(ingredient);
  const trimmed = replaceFractionsInText(ingredient)
    .trim()
    .replace(new RegExp(`^(${measurementRegexp.source})`), "")
    .trim()
    .replace(new RegExp(`^(${quantityRegexp.source})`, "i"), "")
    .trim()
    .replace(new RegExp(`^(${fillerWordsRegexp.source})`, "i"), "")
    .trim()
    .replace(new RegExp(`(${fillerWordsRegexp.source})$`, "i"), "")
    .trim()
    .replace(new RegExp(`(${notesRegexp.source})`, "i"), "")
    .trim()
    .replace(new RegExp(`,$`, "i"), "")
    .trim();
  if (trimmed !== ingredient) {
    return stripIngredient(trimmed);
  } else {
    return trimmed;
  }
};

const NUM_SCALED_DECIMAL_PLACES = 3;

export const parseIngredients = (
  ingredients: string,
  scale: number,
): {
  content: string;
  originalContent: string;
  htmlContent: string;
  complete: boolean;
  isHeader: boolean;
  isRtl: boolean;
}[] => {
  if (!ingredients) return [];

  ingredients = replaceFractionsInText(ingredients);

  const lines = ingredients.split(lineSplitRegex).map((match) => ({
    content: match,
    originalContent: match,
    htmlContent: match,
    complete: false,
    isHeader: false,
    isRtl: isRtlText(match),
  }));

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].content.trim(); // Trim only spaces (no newlines)

    const headerMatches = line.match(headerRegexp);

    const ingredientPartDelimiters = line.match(
      new RegExp(multipartQuantifierRegexp, "g"),
    ); // Multipart measurements (1 cup + 1 tablespoon)
    const ingredientParts = line.split(multipartQuantifierRegexp); // Multipart measurements (1 cup + 1 tablespoon)
    const measurementMatches = ingredientParts.map((linePart) =>
      linePart.match(measurementRegexp),
    );

    if (headerMatches && headerMatches.length > 0) {
      const header = headerMatches[0];
      const headerContent = header.substring(1, header.length - 1); // Chop off brackets

      lines[i].content = headerContent;
      lines[i].htmlContent = `<b class="sectionHeader">${headerContent}</b>`;
      lines[i].isHeader = true;
    } else if (measurementMatches.find((el) => el && el.length > 0)) {
      const processIngredientPart = (
        el: RegExpMatchArray | null,
        idx: number,
        wrapInBold: boolean,
      ): string => {
        if (!el) return ingredientParts[idx];

        try {
          const measurement = el[0];
          const measurementPartDelimiters =
            measurement.match(/(-)|( to )|( - )/g);
          const measurementParts = measurement.split(/-|to/);

          for (let j = 0; j < measurementParts.length; j++) {
            const frac = new FractionJS(measurementParts[j].trim()).mul(scale);
            let scaledMeasurement = frac.toString(NUM_SCALED_DECIMAL_PLACES);

            if (measurementParts[j].indexOf("/") > -1) {
              scaledMeasurement = frac.toFraction(true);
            }

            measurementParts[j] = wrapInBold
              ? '<b class="ingredientMeasurement">' + scaledMeasurement + "</b>"
              : scaledMeasurement.toString();
          }

          let updatedMeasurement: string;
          if (measurementPartDelimiters) {
            updatedMeasurement = measurementParts.reduce(
              (acc, measurementPart, idx) =>
                acc + measurementPart + (measurementPartDelimiters[idx] || ""),
              "",
            );
          } else {
            updatedMeasurement = measurementParts.join(" to ");
          }

          return ingredientParts[idx].replace(
            measurementRegexp,
            updatedMeasurement,
          );
        } catch (e) {
          console.error("failed to parse", e);
          return ingredientParts[idx];
        }
      };

      const plainIngredientParts = measurementMatches.map((el, idx) =>
        processIngredientPart(el, idx, false),
      );
      const htmlIngredientParts = measurementMatches.map((el, idx) =>
        processIngredientPart(el, idx, true),
      );

      if (ingredientPartDelimiters) {
        lines[i].content = plainIngredientParts.reduce(
          (acc, ingredientPart, idx) =>
            acc + ingredientPart + (ingredientPartDelimiters[idx] || ""),
          "",
        );
        lines[i].htmlContent = htmlIngredientParts.reduce(
          (acc, ingredientPart, idx) =>
            acc + ingredientPart + (ingredientPartDelimiters[idx] || ""),
          "",
        );
        lines[i].isRtl = isRtlText(lines[i].originalContent);
      } else {
        lines[i].content = plainIngredientParts.join(" + ");
        lines[i].htmlContent = htmlIngredientParts.join(" + ");
        lines[i].isRtl = isRtlText(lines[i].originalContent);
      }

      lines[i].isHeader = false;
    }

    lines[i].content = convertEscapedLineContinuations(lines[i].content, false);
    lines[i].htmlContent = convertEscapedLineContinuations(
      lines[i].htmlContent,
      true,
    );
  }

  return lines;
};

const scaleInstructionNumbers = (
  instructions: string,
  scale: number,
  htmlOutput: boolean,
): string =>
  instructions.replace(/\{([^{}]+)\}/g, (match, value) => {
    const trimmed = value.trim();
    if (!trimmed || !/^[0-9./\s-]+$/.test(trimmed)) return match;

    try {
      const frac = new FractionJS(trimmed).mul(scale);
      let result = frac.toString(NUM_SCALED_DECIMAL_PLACES);
      if (trimmed.includes("/")) {
        result = frac.toFraction(true);
      }

      if (htmlOutput) return `<b class="instructionMeasurement">${result}</b>`;
      return result;
    } catch (e) {
      console.warn(value, match, e);
      return match;
    }
  });

export const parseInstructions = (
  instructions: string,
  scale: number,
): {
  content: string;
  htmlContent: string;
  isHeader: boolean;
  count: number;
  complete: boolean;
  isRtl: boolean;
}[] => {
  instructions = replaceFractionsInText(instructions);

  const plainInstructions = scaleInstructionNumbers(instructions, scale, false);
  const htmlInstructions = scaleInstructionNumbers(instructions, scale, true);

  // Starts with [, anything inbetween, ends with ]
  const headerRegexp = /^\[.*\]$/;

  const plainLines = plainInstructions
    .split(lineSplitRegex)
    .filter((i) => i.trim().length);
  const htmlLines = htmlInstructions
    .split(lineSplitRegex)
    .filter((i) => i.trim().length);

  let stepCount = 1;
  return plainLines.map((instruction, idx) => {
    const plainLine = instruction.trim();
    const htmlLine = htmlLines[idx].trim();
    const headerMatches = plainLine.match(headerRegexp);

    if (headerMatches && headerMatches.length > 0) {
      const plainHeader = plainLine.substring(1, plainLine.length - 1); // Chop off brackets
      const htmlHeader = `<b class="sectionHeader">${htmlLine.substring(1, htmlLine.length - 1)}</b>`; // Chop off brackets

      stepCount = 1;

      return {
        content: convertEscapedLineContinuations(plainHeader, false),
        htmlContent: convertEscapedLineContinuations(htmlHeader, true),
        isHeader: true,
        count: 0,
        complete: false,
        isRtl: isRtlText(plainHeader, true),
      };
    } else {
      return {
        content: convertEscapedLineContinuations(plainLine, false),
        htmlContent: convertEscapedLineContinuations(htmlLine, true),
        isHeader: false,
        count: stepCount++,
        complete: false,
        isRtl: isRtlText(plainLine, true),
      };
    }
  });
};

export const parseNotes = (
  notes: string,
): {
  content: string;
  htmlContent: string;
  isHeader: boolean;
  isRtl: boolean;
}[] => {
  // Starts with [, anything inbetween, ends with ]
  const headerRegexp = /^\[.*\]$/;

  const plainLines = notes.split(lineSplitRegex);
  const htmlLines = notes.split(lineSplitRegex);

  return plainLines.map((note, idx) => {
    const plainLine = note.trim();
    const htmlLine = htmlLines[idx].trim();
    const headerMatches = plainLine.match(headerRegexp);

    if (headerMatches && headerMatches.length > 0) {
      const plainHeader = plainLine.substring(1, plainLine.length - 1); // Chop off brackets
      const htmlHeader = `<b class="sectionHeader">${htmlLine.substring(1, htmlLine.length - 1)}</b>`; // Chop off brackets

      return {
        content: convertEscapedLineContinuations(plainHeader, false),
        htmlContent: convertEscapedLineContinuations(htmlHeader, true),
        isHeader: true,
        isRtl: isRtlText(plainHeader),
      };
    } else {
      return {
        content: convertEscapedLineContinuations(plainLine, false),
        htmlContent: convertEscapedLineContinuations(htmlLine, true),
        isHeader: false,
        isRtl: isRtlText(plainLine),
      };
    }
  });
};

/* eslint-disable no-control-regex */
export const isRtlText = (text: string, onlyFirstWord = true): boolean => {
  const rtlChars = new RegExp("[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]");
  const ltrChars = new RegExp(
    "[\u0000-\u0590\u2000-\u202E\u202A-\u202E\uFB00-\uFB4F]",
  );
  const aToZ = new RegExp("[a-zA-Z]");
  let rtlCount = 0;
  let ltrCount = 0;
  if (onlyFirstWord) {
    const splits = text.split(" ");
    for (let i = 0; i < splits.length; i++) {
      if (
        rtlChars.test(splits[i].charAt(0)) ||
        aToZ.test(splits[i].charAt(0))
      ) {
        text = splits[i];
        break;
      }
    }
  }
  for (let i = 0; i < text.length; i++) {
    if (rtlChars.test(text[i])) {
      rtlCount++;
    } else if (ltrChars.test(text[i])) {
      ltrCount++;
    }
  }

  return rtlCount > ltrCount;
};
