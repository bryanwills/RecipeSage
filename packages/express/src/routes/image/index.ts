import express from "express";
import { createRecipeImageHandler } from "./createRecipeImage";
import { createRecipeImageFromUrlHandler } from "./createRecipeImageFromUrl";

const router = express.Router();

router.use("/createRecipeImage", createRecipeImageHandler);
router.use("/createRecipeImageFromUrl", createRecipeImageFromUrlHandler);

export { router as imageRouter };
