import { prisma } from "@recipesage/prisma";
import { z } from "zod";
import {
  getAccessToMealPlan,
  MealPlanAccessLevel,
} from "@recipesage/util/server/db";
import { NotFoundError } from "../../errors";
import { AuthenticationEnforcement, defineHandler } from "../../defineHandler";
import { translate } from "@recipesage/util/server/general";

const schema = {
  query: z.object({
    version: z.string(),
    viewType: z.enum(["calendar", "list"]),
    calendarMonth: z.string().optional(),
    calendarYear: z.string().optional(),
    startOfWeek: z.enum(["sunday", "monday"]).optional(),
    preferredLanguage: z.string().optional(),
  }),
  params: z.object({
    mealPlanId: z.string(),
  }),
};

const MEAL_SORT_ORDER: Record<string, number> = {
  breakfast: 1,
  lunch: 2,
  dinner: 3,
  snacks: 4,
  other: 5,
};

const MEAL_I18N_KEYS: Record<string, string> = {
  breakfast: "components.mealCalendar.breakfast",
  lunch: "components.mealCalendar.lunch",
  dinner: "components.mealCalendar.dinner",
  snacks: "components.mealCalendar.snack",
  other: "components.mealCalendar.other",
};

function formatDateUTC(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDatePretty(dateStr: string, locale: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toLocaleDateString(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function getMonthName(month: number, year: number, locale: string): string {
  const date = new Date(Date.UTC(year, month - 1, 1));
  return date.toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

interface PrintItem {
  title: string;
  meal: string;
  mealLabel: string;
  notes: string;
}

interface CalendarDay {
  date: number;
  dateStr: string;
  inactive: boolean;
  isToday: boolean;
  itemsByMeal: Record<string, PrintItem[]>;
  meals: string[];
}

export const printMealPlanHandler = defineHandler(
  {
    schema,
    authentication: AuthenticationEnforcement.Required,
  },
  async (req, res) => {
    const mealPlan = await prisma.mealPlan.findUnique({
      where: {
        id: req.params.mealPlanId,
      },
      select: {
        id: true,
        title: true,
      },
    });

    const access = await getAccessToMealPlan(
      res.locals.session.userId,
      req.params.mealPlanId,
    );

    if (!mealPlan || access.level === MealPlanAccessLevel.None) {
      throw new NotFoundError("Meal plan not found or you do not have access");
    }

    const mealPlanItems = await prisma.mealPlanItem.findMany({
      where: {
        mealPlanId: req.params.mealPlanId,
      },
      select: {
        id: true,
        title: true,
        notes: true,
        scheduledDate: true,
        meal: true,
        recipeId: true,
        recipe: {
          select: {
            title: true,
          },
        },
      },
    });

    const languageHeader =
      req.query.preferredLanguage || req.headers["accept-language"] || "en-us";
    const locale = (req.query.preferredLanguage || "en-US").replace("_", "-");

    const mealLabels: Record<string, string> = {};
    for (const [meal, key] of Object.entries(MEAL_I18N_KEYS)) {
      mealLabels[meal] = await translate(languageHeader, key);
    }

    const itemsByDateStr = new Map<string, PrintItem[]>();
    for (const item of mealPlanItems) {
      const dateStr = formatDateUTC(item.scheduledDate);
      const printItem: PrintItem = {
        title: item.recipe?.title || item.title,
        meal: item.meal,
        mealLabel: mealLabels[item.meal] || item.meal,
        notes: item.notes,
      };

      const existing = itemsByDateStr.get(dateStr);
      if (existing) {
        existing.push(printItem);
      } else {
        itemsByDateStr.set(dateStr, [printItem]);
      }
    }

    for (const items of itemsByDateStr.values()) {
      items.sort(
        (a, b) =>
          (MEAL_SORT_ORDER[a.meal] || 6) - (MEAL_SORT_ORDER[b.meal] || 6),
      );
    }

    if (req.query.viewType === "calendar") {
      const month = parseInt(
        req.query.calendarMonth || String(new Date().getMonth() + 1),
        10,
      );
      const year = parseInt(
        req.query.calendarYear || String(new Date().getFullYear()),
        10,
      );
      const startOfWeek = req.query.startOfWeek || "sunday";

      const startOfMonth = new Date(Date.UTC(year, month - 1, 1));
      const endOfMonth = new Date(Date.UTC(year, month, 0));

      let startDay = startOfMonth.getUTCDay();
      if (startOfWeek === "monday") {
        startDay = startDay === 0 ? 6 : startDay - 1;
      }
      const startOfCalendar = new Date(startOfMonth);
      startOfCalendar.setUTCDate(startOfCalendar.getUTCDate() - startDay);

      const endDay = endOfMonth.getUTCDay();
      const daysToAdd =
        startOfWeek === "monday" ? (endDay === 0 ? 0 : 7 - endDay) : 6 - endDay;
      const endOfCalendar = new Date(endOfMonth);
      endOfCalendar.setUTCDate(endOfCalendar.getUTCDate() + daysToAdd);

      const dayTitles =
        startOfWeek === "monday"
          ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
          : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

      const todayStr = formatDateUTC(new Date());
      const weeks: CalendarDay[][] = [];
      let currentWeek: CalendarDay[] = [];
      const iter = new Date(startOfCalendar);

      while (iter <= endOfCalendar) {
        const dateStr = formatDateUTC(iter);
        const dayItems = itemsByDateStr.get(dateStr) || [];

        const itemsByMeal: Record<string, PrintItem[]> = {};
        const mealsPresent: string[] = [];
        const mealOrder = ["breakfast", "lunch", "dinner", "snacks", "other"];
        for (const m of mealOrder) {
          const mealItems = dayItems.filter((i) => i.meal === m);
          if (mealItems.length > 0) {
            itemsByMeal[m] = mealItems;
            mealsPresent.push(m);
          }
        }

        currentWeek.push({
          date: iter.getUTCDate(),
          dateStr,
          inactive: iter.getUTCMonth() !== month - 1,
          isToday: dateStr === todayStr,
          itemsByMeal,
          meals: mealsPresent,
        });

        if (currentWeek.length === 7) {
          weeks.push(currentWeek);
          currentWeek = [];
        }

        iter.setUTCDate(iter.getUTCDate() + 1);
      }

      if (currentWeek.length > 0) {
        weeks.push(currentWeek);
      }

      res.render("mealplan-default", {
        title: mealPlan.title,
        viewType: "calendar",
        monthTitle: getMonthName(month, year, locale),
        dayTitles,
        weeks,
        mealLabels,
        date: new Date().toDateString(),
      });
    } else {
      const todayStr = formatDateUTC(new Date());

      const futureDates = Array.from(itemsByDateStr.keys())
        .filter((dateStr) => dateStr >= todayStr)
        .sort();

      const dates = futureDates.map((dateStr) => ({
        dateStr,
        formattedDate: formatDatePretty(dateStr, locale),
        items: itemsByDateStr.get(dateStr) || [],
      }));

      res.render("mealplan-default", {
        title: mealPlan.title,
        viewType: "list",
        dates,
        date: new Date().toDateString(),
      });
    }
  },
);
