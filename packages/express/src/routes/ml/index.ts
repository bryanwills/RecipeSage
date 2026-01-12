import express from "express";
import { getRecipeFromOCRHandler } from "./getRecipeFromOCR";
import { getRecipeFromPDFHandler } from "./getRecipeFromPDF";

const router = express.Router();

router.use("/getRecipeFromOCR", getRecipeFromOCRHandler);
router.use("/getRecipeFromPDF", getRecipeFromPDFHandler);

export { router as mlRouter };
