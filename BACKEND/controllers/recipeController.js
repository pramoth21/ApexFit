const fs = require("fs");
const path = require("path");
const Recipe = require("../models/Recipe");

const deleteImageFile = (imagePath) => {
    if (!imagePath) return;

    const filename = imagePath.split("/").pop();
    const fullPath = path.join(__dirname, "..", "uploads", "recipes", filename);

    fs.unlink(fullPath, (err) => {
        if (err && err.code !== "ENOENT") {
            console.log("Failed to delete old image:", err.message);
        }
    });
};

const parseArrayField = (value) => {
    // Supports real arrays (JSON) or comma-separated text (form-data)
    if (!value) return [];
    if (Array.isArray(value)) return value;
    return value.split(",").map((item) => item.trim()).filter(Boolean);
};

// A user counts as "Senior" for recipe filtering once they're 50+
const isSenior = (age) => {
    return age && age >= 50;
};

// @desc    Create a new recipe (admin only)
// @route   POST /api/recipes
// @access  Private/Admin
const createRecipe = async (req, res) => {
    try {
        const {
            name,
            description,
            ingredients,
            instructions,
            calories,
            protein,
            carbs,
            fat,
            servings,
            prepTime,
            tags
        } = req.body;

        if (!name || calories === undefined || protein === undefined || carbs === undefined || fat === undefined) {
            return res.status(400).json({
                success: false,
                message: "name, calories, protein, carbs, and fat are required."
            });
        }

        const recipe = await Recipe.create({
            name,
            description,
            ingredients: parseArrayField(ingredients),
            instructions: parseArrayField(instructions),
            calories,
            protein,
            carbs,
            fat,
            servings: servings || 1,
            prepTime: prepTime || null,
            tags: parseArrayField(tags),
            image: req.file ? `/uploads/recipes/${req.file.filename}` : null,
            createdBy: req.user._id
        });

        return res.status(201).json({
            success: true,
            message: "Recipe created successfully.",
            recipe
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to create recipe.",
            error: error.message
        });
    }
};

// @desc    Get all recipes (with optional filters)
// @route   GET /api/recipes?tag=&search=&maxCalories=
// @access  Public
const getAllRecipes = async (req, res) => {
    try {
        const { tag, search, maxCalories } = req.query;

        const query = { isActive: true };

        if (tag) query.tags = tag;
        if (search) query.name = { $regex: search, $options: "i" };
        if (maxCalories) query.calories = { $lte: Number(maxCalories) };

        const recipes = await Recipe.find(query).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: recipes.length,
            recipes
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch recipes.",
            error: error.message
        });
    }
};

// @desc    Get a single recipe
// @route   GET /api/recipes/:id
// @access  Public
const getRecipeById = async (req, res) => {
    try {
        const recipe = await Recipe.findById(req.params.id);

        if (!recipe) {
            return res.status(404).json({
                success: false,
                message: "Recipe not found."
            });
        }

        return res.status(200).json({
            success: true,
            recipe
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch recipe.",
            error: error.message
        });
    }
};

// @desc    Update a recipe (admin only)
// @route   PUT /api/recipes/:id
// @access  Private/Admin
const updateRecipe = async (req, res) => {
    try {
        const recipe = await Recipe.findById(req.params.id);

        if (!recipe) {
            return res.status(404).json({
                success: false,
                message: "Recipe not found."
            });
        }

        const {
            name,
            description,
            ingredients,
            instructions,
            calories,
            protein,
            carbs,
            fat,
            servings,
            prepTime,
            tags,
            isActive
        } = req.body;

        if (name !== undefined) recipe.name = name;
        if (description !== undefined) recipe.description = description;
        if (ingredients !== undefined) recipe.ingredients = parseArrayField(ingredients);
        if (instructions !== undefined) recipe.instructions = parseArrayField(instructions);
        if (calories !== undefined) recipe.calories = calories;
        if (protein !== undefined) recipe.protein = protein;
        if (carbs !== undefined) recipe.carbs = carbs;
        if (fat !== undefined) recipe.fat = fat;
        if (servings !== undefined) recipe.servings = servings;
        if (prepTime !== undefined) recipe.prepTime = prepTime;
        if (tags !== undefined) recipe.tags = parseArrayField(tags);
        if (isActive !== undefined) recipe.isActive = isActive;

        if (req.file) {
            deleteImageFile(recipe.image);
            recipe.image = `/uploads/recipes/${req.file.filename}`;
        }

        const updatedRecipe = await recipe.save();

        return res.status(200).json({
            success: true,
            message: "Recipe updated successfully.",
            recipe: updatedRecipe
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to update recipe.",
            error: error.message
        });
    }
};

// @desc    Delete a recipe (admin only)
// @route   DELETE /api/recipes/:id
// @access  Private/Admin
const deleteRecipe = async (req, res) => {
    try {
        const recipe = await Recipe.findById(req.params.id);

        if (!recipe) {
            return res.status(404).json({
                success: false,
                message: "Recipe not found."
            });
        }

        deleteImageFile(recipe.image);
        await recipe.deleteOne();

        return res.status(200).json({
            success: true,
            message: "Recipe deleted successfully."
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to delete recipe.",
            error: error.message
        });
    }
};

// @desc    Get recipes matched to the logged-in user's goal / senior status
// @route   GET /api/recipes/recommendations
// @access  Private
const getMyRecommendedRecipes = async (req, res) => {
    try {
        const user = req.user;
        const senior = isSenior(user.age);

        if (!user.goal && !senior) {
            return res.status(400).json({
                success: false,
                message: "Complete your profile (age and goal) to get recipe recommendations."
            });
        }

        const orConditions = [];
        if (user.goal) orConditions.push({ tags: user.goal });
        if (senior) orConditions.push({ tags: "Senior" });

        const recipes = await Recipe.find({
            isActive: true,
            $or: orConditions
        }).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            basedOn: {
                goal: user.goal || null,
                senior
            },
            count: recipes.length,
            recipes
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch recipe recommendations.",
            error: error.message
        });
    }
};

module.exports = {
    createRecipe,
    getAllRecipes,
    getRecipeById,
    updateRecipe,
    deleteRecipe,
    getMyRecommendedRecipes
};