import express from "express";
const router = express.Router();

import { wrapRequestWithErrorHandler } from "../utils/wrapRequestWithErrorHandler.js";

router.get(
  "/",
  wrapRequestWithErrorHandler(async (req, res) => {
    const originalModifiers = req.query.modifiers
      ? req.query.modifiers.split(",")
      : [];

    const mappedModifiers = {
      titleImage:
        originalModifiers.indexOf("noimage") === -1 &&
        req.query.template != "compact",
      halfsheet:
        originalModifiers.indexOf("halfsheet") !== -1 ||
        req.query.template == "compact" ||
        req.query.template == "halfsheet",
    };

    const modifierQuery = Object.keys(mappedModifiers)
      .filter((m) => mappedModifiers[m])
      .map((modifier) => `&${modifier}=true`)
      .join("");

    const tokenQuery = req.query.token ? `&token=${req.query.token}` : "";

    res.redirect(
      302,
      `/api/print/recipe/${req.query.recipeId}?printPreview=true&version=legacy${modifierQuery}${tokenQuery}`,
    );
  }),
);

router.get(
  "/:recipeId",
  wrapRequestWithErrorHandler(async (req, res) => {
    const queryString = new URLSearchParams(req.query).toString();
    res.redirect(
      302,
      `/api/print/recipe/${req.params.recipeId}${queryString ? `?${queryString}` : ""}`,
    );
  }),
);

export default router;
