const express = require("express");
const router = express.Router();

const {
    createRecipe,
    getAllRecipes,
    getRecipeById,
    updateRecipe,
    deleteRecipe,
    getMyRecommendedRecipes
} = require("../controllers/recipeController");

const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const uploadRecipeImage = require("../middleware/uploadRecipeImage");

// IMPORTANT: /recommendations must come BEFORE /:id
router.get("/recommendations", protect, getMyRecommendedRecipes);

router.get("/", getAllRecipes);
router.get("/:id", getRecipeById);

router.post("/", protect, authorizeRoles("admin"), uploadRecipeImage.single("image"), createRecipe);
router.put("/:id", protect, authorizeRoles("admin"), uploadRecipeImage.single("image"), updateRecipe);
router.delete("/:id", protect, authorizeRoles("admin"), deleteRecipe);

module.exports = router;