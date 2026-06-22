const express = require("express");

const {
    createFood,
    getFoods,
    getFoodById,
    updateFood,
    deleteFood,
    seedFoods
} = require("../controllers/foodController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/seed", protect, seedFoods);

router.route("/")
    .post(protect, createFood)
    .get(protect, getFoods);

router.route("/:id")
    .get(protect, getFoodById)
    .put(protect, updateFood)
    .delete(protect, deleteFood);

module.exports = router;