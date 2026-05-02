import express from "express";
const router = express.Router();
import cors from "cors";

// DB
import { Op } from "sequelize";
import {
  sequelize,
  User,
  Recipe,
  Image,
  MealPlan,
  MealPlanItem,
  ShoppingList,
  ShoppingListItem,
} from "../models/index.js";

// Service
import * as MiddlewareService from "../services/middleware.js";

// Util
import { wrapRequestWithErrorHandler } from "../utils/wrapRequestWithErrorHandler.js";
import { NotFound, BadRequest } from "../utils/errors.js";

router.post(
  "/",
  cors(),
  MiddlewareService.validateSession(["user"]),
  MiddlewareService.validateUser,
  wrapRequestWithErrorHandler(async (req, res) => {
    const mealPlan = await sequelize.transaction(async (transaction) => {
      const mealPlan = await MealPlan.create(
        {
          title: req.body.title,
          userId: res.locals.session.userId,
        },
        {
          transaction,
        },
      );

      await mealPlan.addCollaborators(req.body.collaborators || [], {
        transaction,
      });

      return mealPlan;
    });

    res.status(200).json(mealPlan);
  }),
);

router.get(
  "/",
  cors(),
  MiddlewareService.validateSession(["user"]),
  wrapRequestWithErrorHandler(async (req, res) => {
    const mealPlanIds = (
      await MealPlan.findAll({
        where: {
          [Op.or]: [
            { userId: res.locals.session.userId },
            { "$collaborators.id$": res.locals.session.userId },
          ],
        },
        include: [
          {
            model: User,
            as: "collaborators",
            attributes: ["id"],
          },
        ],
        attributes: ["id"],
      })
    ).map((result) => result.id);

    const mealPlans = await MealPlan.findAll({
      where: {
        id: mealPlanIds,
      },
      include: [
        {
          model: User,
          as: "collaborators",
          attributes: ["id", "name", "handle"],
        },
        {
          model: User,
          as: "owner",
          attributes: ["id", "name", "handle"],
        },
        {
          model: MealPlanItem,
          as: "items",
          attributes: [],
        },
      ],
      attributes: [
        "id",
        "title",
        "createdAt",
        "updatedAt",
        [sequelize.fn("COUNT", sequelize.col("items.id")), "itemCount"],
      ],
      group: [
        "MealPlan.id",
        "collaborators.id",
        "collaborators->MealPlan_Collaborator.id",
        "owner.id",
      ],
      order: [["updatedAt", "DESC"]],
    });

    const serializedMealPlan = mealPlans.map((plan) => {
      const p = plan.dataValues;
      p.myUserId = res.locals.session.userId;

      return p;
    });

    res.status(200).json(serializedMealPlan);
  }),
);

// Add items to a meal plan
router.post(
  "/:mealPlanId",
  cors(),
  MiddlewareService.validateSession(["user"]),
  MiddlewareService.validateUser,
  wrapRequestWithErrorHandler(async (req, res) => {
    const mealPlan = await MealPlan.findOne({
      where: {
        id: req.params.mealPlanId,
        [Op.or]: [
          { userId: res.locals.session.userId },
          { "$collaborators.id$": res.locals.session.userId },
        ],
      },
      include: [
        {
          model: User,
          as: "collaborators",
          attributes: ["id"],
        },
      ],
    });

    if (!mealPlan) {
      throw NotFound(
        "Meal plan with that ID not found or you do not have access!",
      );
    }

    // REST api does not support new date format
    const legacyScheduled = new Date(req.body.scheduled);
    const legacyScheduledDate = legacyScheduled.toISOString().split("T")[0];

    await MealPlanItem.create({
      title: req.body.title,
      scheduled: legacyScheduled,
      scheduledDate: legacyScheduledDate,
      meal: req.body.meal,
      recipeId: req.body.recipeId || null,
      userId: res.locals.session.userId,
      mealPlanId: mealPlan.id,
    });

    res.status(200).json({
      reference: Date.now(),
    });
  }),
);

// Delete meal plan from account
router.delete(
  "/:mealPlanId",
  cors(),
  MiddlewareService.validateSession(["user"]),
  MiddlewareService.validateUser,
  wrapRequestWithErrorHandler(async (req, res) => {
    const mealPlan = await MealPlan.findOne({
      where: {
        id: req.params.mealPlanId,
        [Op.or]: [
          { userId: res.locals.session.userId },
          { "$collaborators.id$": res.locals.session.userId },
        ],
      },
      include: [
        {
          model: User,
          as: "collaborators",
          attributes: ["id"],
        },
      ],
    });

    if (!mealPlan) {
      throw NotFound("Meal plan not found or not visible to you!");
    }

    if (mealPlan.userId === res.locals.session.userId) {
      await mealPlan.destroy();
    } else {
      await mealPlan.removeCollaborator(res.locals.session.userId);
    }

    res.status(200).json({});
  }),
);

// Delete items from a meal plan, either by recipeId or by itemId
router.delete(
  "/:mealPlanId/items",
  cors(),
  MiddlewareService.validateSession(["user"]),
  MiddlewareService.validateUser,
  wrapRequestWithErrorHandler(async (req, res) => {
    const mealPlan = await MealPlan.findOne({
      where: {
        id: req.params.mealPlanId,
        [Op.or]: [
          { userId: res.locals.session.userId },
          { "$collaborators.id$": res.locals.session.userId },
        ],
      },
      include: [
        {
          model: User,
          as: "collaborators",
          attributes: ["id"],
        },
      ],
    });

    if (!mealPlan) {
      throw NotFound("Meal plan does not exist or you do not have access");
    }

    await MealPlanItem.destroy({
      where: {
        id: req.query.itemId,
        mealPlanId: mealPlan.id,
      },
    });

    res.status(200).json({
      reference: Date.now(),
    });
  }),
);

// Update items from a meal plan in bulk
router.put(
  "/:mealPlanId/items/bulk",
  cors(),
  MiddlewareService.validateSession(["user"]),
  MiddlewareService.validateUser,
  wrapRequestWithErrorHandler(async (req, res) => {
    await sequelize.transaction(async (transaction) => {
      const mealPlan = await MealPlan.findOne({
        where: {
          id: req.params.mealPlanId,
          [Op.or]: [
            { userId: res.locals.session.userId },
            { "$collaborators.id$": res.locals.session.userId },
          ],
        },
        include: [
          {
            model: User,
            as: "collaborators",
            attributes: ["id"],
          },
        ],
        transaction,
      });

      if (!mealPlan) {
        throw NotFound("Meal plan does not exist or you do not have access");
      }

      for (const item of req.body.items) {
        await MealPlanItem.update(
          {
            title: item.title,
            recipeId: item.recipeId || null,
            meal: item.meal,
            scheduled: item.scheduled,
          },
          {
            where: {
              id: item.id,
              mealPlanId: mealPlan.id,
            },
            transaction,
          },
        );
      }
    });

    res.status(200).json({
      reference: Date.now(),
    });
  }),
);

// Create items for a meal plan in bulk
router.post(
  "/:mealPlanId/items/bulk",
  cors(),
  MiddlewareService.validateSession(["user"]),
  MiddlewareService.validateUser,
  wrapRequestWithErrorHandler(async (req, res) => {
    await sequelize.transaction(async (transaction) => {
      const mealPlan = await MealPlan.findOne({
        where: {
          id: req.params.mealPlanId,
          [Op.or]: [
            { userId: res.locals.session.userId },
            { "$collaborators.id$": res.locals.session.userId },
          ],
        },
        include: [
          {
            model: User,
            as: "collaborators",
            attributes: ["id"],
          },
        ],
        transaction,
      });

      if (!mealPlan) {
        throw NotFound("Meal plan does not exist or you do not have access");
      }

      await MealPlanItem.bulkCreate(
        req.body.items.map((item) => ({
          userId: res.locals.session.userId,
          mealPlanId: mealPlan.id,
          title: item.title,
          recipeId: item.recipeId || null,
          meal: item.meal,
          scheduled: item.scheduled,
        })),
        {
          transaction,
        },
      );
    });

    res.status(200).json({
      reference: Date.now(),
    });
  }),
);

router.delete(
  "/:mealPlanId/items/bulk",
  cors(),
  MiddlewareService.validateSession(["user"]),
  MiddlewareService.validateUser,
  wrapRequestWithErrorHandler(async (req, res) => {
    await sequelize.transaction(async (transaction) => {
      const mealPlan = await MealPlan.findOne({
        where: {
          id: req.params.mealPlanId,
          [Op.or]: [
            { userId: res.locals.session.userId },
            { "$collaborators.id$": res.locals.session.userId },
          ],
        },
        include: [
          {
            model: User,
            as: "collaborators",
            attributes: ["id"],
          },
        ],
        transaction,
      });

      if (!mealPlan) {
        throw NotFound("Meal plan does not exist or you do not have access");
      }

      const mealPlanItemIds = req.query.itemIds.split(",");
      if (!mealPlanItemIds || mealPlanItemIds.length === 0) {
        throw BadRequest("Must provide itemIds");
      }

      await MealPlanItem.destroy({
        where: {
          id: mealPlanItemIds,
          mealPlanId: mealPlan.id,
        },
        transaction,
      });
    });

    res.status(200).json({
      reference: Date.now(),
    });
  }),
);

//Get a single meal plan
router.get(
  "/:mealPlanId",
  cors(),
  MiddlewareService.validateSession(["user"]),
  MiddlewareService.validateUser,
  wrapRequestWithErrorHandler(async (req, res) => {
    const mealPlan = await MealPlan.findOne({
      where: {
        id: req.params.mealPlanId,
        [Op.or]: [
          { userId: res.locals.session.userId },
          { "$collaborators.id$": res.locals.session.userId },
        ],
      },
      include: [
        {
          model: User,
          as: "collaborators",
          attributes: ["id"],
        },
      ],
    });

    if (!mealPlan) {
      throw NotFound("Meal plan not found or you do not have access");
    }

    const mealPlanSummary = await MealPlan.findOne({
      where: {
        id: mealPlan.id,
      },
      include: [
        {
          model: User,
          as: "collaborators",
          attributes: ["id", "name", "handle"],
        },
        {
          model: User,
          as: "owner",
          attributes: ["id", "name", "handle"],
        },
        {
          model: MealPlanItem,
          as: "items",
          attributes: [
            "id",
            "title",
            "scheduled",
            "scheduledDate",
            "meal",
            "createdAt",
            "updatedAt",
          ],
          include: [
            {
              model: User,
              as: "owner",
              attributes: ["id", "name", "handle"],
            },
            {
              model: ShoppingListItem,
              as: "shoppingListItems",
              attributes: ["id", "title"],
              include: [
                {
                  model: ShoppingList,
                  as: "shoppingList",
                  attributes: ["id", "title"],
                },
              ],
            },
            {
              model: Recipe,
              as: "recipe",
              attributes: ["id", "title", "ingredients"],
              include: [
                {
                  model: Image,
                  as: "images",
                  attributes: ["id", "location"],
                },
              ],
            },
          ],
        },
      ],
    });

    res.status(200).json(mealPlanSummary);
  }),
);

export default router;
