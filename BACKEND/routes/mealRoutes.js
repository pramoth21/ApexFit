const express = require("express");

const {
    createMeal,
    getUserMeals,
    getMealById,
    updateMeal,
    deleteMeal,
    getDailyNutritionSummary
} = require("../controllers/mealController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/summary/daily", protect, getDailyNutritionSummary);

router.route("/")
    .post(protect, createMeal)
    .get(protect, getUserMeals);

router.route("/:id")
    .get(protect, getMealById)
    .put(protect, updateMeal)
    .delete(protect, deleteMeal);

module.exports = router;