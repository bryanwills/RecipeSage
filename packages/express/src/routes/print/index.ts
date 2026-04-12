import express from "express";
import { printShoppingListHandler } from "./printShoppingList";
import { printMealPlanHandler } from "./printMealPlan";

const router = express.Router();

router.get("/shoppingList/:shoppingListId", ...printShoppingListHandler);
router.get("/mealPlan/:mealPlanId", ...printMealPlanHandler);

export { router as printRouter };
