const Food = require("../models/Food");
const Meal = require("../models/Meal");

const roundNumber = (num) => {
    return Number(num.toFixed(2));
};

const getDateRange = (dateValue) => {
    const date = dateValue ? new Date(dateValue) : new Date();

    const start = new Date(date);
    start.setHours(0, 0, 0, 0);

    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    return { start, end };
};

const calculateMealFoods = async (foodsInput) => {
    const calculatedFoods = [];

    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    for (const item of foodsInput) {
        const food = await Food.findById(item.foodId);

        if (!food || !food.isActive) {
            throw new Error(`Food not found or inactive: ${item.foodId}`);
        }

        const quantity = Number(item.quantity);

        if (!quantity || quantity <= 0) {
            throw new Error("Food quantity must be greater than 0.");
        }

        const multiplier = quantity / food.servingSize;

        const calories = roundNumber(food.calories * multiplier);
        const protein = roundNumber(food.protein * multiplier);
        const carbs = roundNumber(food.carbs * multiplier);
        const fat = roundNumber(food.fat * multiplier);

        calculatedFoods.push({
            food: food._id,
            foodName: food.name,
            quantity,
            servingUnit: food.servingUnit,
            calories,
            protein,
            carbs,
            fat
        });

        totalCalories += calories;
        totalProtein += protein;
        totalCarbs += carbs;
        totalFat += fat;
    }

    return {
        calculatedFoods,
        totals: {
            totalCalories: roundNumber(totalCalories),
            totalProtein: roundNumber(totalProtein),
            totalCarbs: roundNumber(totalCarbs),
            totalFat: roundNumber(totalFat)
        }
    };
};

// @desc    Create meal log
// @route   POST /api/meals
// @access  Private
const createMeal = async (req, res) => {
    try {
        const { mealType, foods, mealDate, notes } = req.body;

        if (!mealType) {
            return res.status(400).json({
                success: false,
                message: "Meal type is required."
            });
        }

        if (!foods || !Array.isArray(foods) || foods.length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one food is required."
            });
        }

        const { calculatedFoods, totals } = await calculateMealFoods(foods);

        const meal = await Meal.create({
            user: req.user._id,
            mealType,
            foods: calculatedFoods,
            totalCalories: totals.totalCalories,
            totalProtein: totals.totalProtein,
            totalCarbs: totals.totalCarbs,
            totalFat: totals.totalFat,
            mealDate: mealDate ? new Date(mealDate) : new Date(),
            notes
        });

        const populatedMeal = await Meal.findById(meal._id).populate(
            "foods.food",
            "name category servingSize servingUnit"
        );

        return res.status(201).json({
            success: true,
            message: "Meal logged successfully.",
            meal: populatedMeal
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to log meal.",
            error: error.message
        });
    }
};

// @desc    Get user meals
// @route   GET /api/meals
// @access  Private
const getUserMeals = async (req, res) => {
    try {
        const { date, mealType } = req.query;

        const query = {
            user: req.user._id
        };

        if (date) {
            const { start, end } = getDateRange(date);
            query.mealDate = {
                $gte: start,
                $lte: end
            };
        }

        if (mealType) {
            query.mealType = mealType;
        }

        const meals = await Meal.find(query)
            .populate("foods.food", "name category servingSize servingUnit")
            .sort({ mealDate: -1 });

        return res.status(200).json({
            success: true,
            count: meals.length,
            meals
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch meals.",
            error: error.message
        });
    }
};

// @desc    Get single meal
// @route   GET /api/meals/:id
// @access  Private
const getMealById = async (req, res) => {
    try {
        const meal = await Meal.findOne({
            _id: req.params.id,
            user: req.user._id
        }).populate("foods.food", "name category servingSize servingUnit");

        if (!meal) {
            return res.status(404).json({
                success: false,
                message: "Meal not found."
            });
        }

        return res.status(200).json({
            success: true,
            meal
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch meal.",
            error: error.message
        });
    }
};

// @desc    Update meal
// @route   PUT /api/meals/:id
// @access  Private
const updateMeal = async (req, res) => {
    try {
        const { mealType, foods, mealDate, notes } = req.body;

        const meal = await Meal.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!meal) {
            return res.status(404).json({
                success: false,
                message: "Meal not found."
            });
        }

        if (mealType !== undefined) {
            meal.mealType = mealType;
        }

        if (mealDate !== undefined) {
            meal.mealDate = new Date(mealDate);
        }

        if (notes !== undefined) {
            meal.notes = notes;
        }

        if (foods !== undefined) {
            if (!Array.isArray(foods) || foods.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "At least one food is required."
                });
            }

            const { calculatedFoods, totals } = await calculateMealFoods(foods);

            meal.foods = calculatedFoods;
            meal.totalCalories = totals.totalCalories;
            meal.totalProtein = totals.totalProtein;
            meal.totalCarbs = totals.totalCarbs;
            meal.totalFat = totals.totalFat;
        }

        const updatedMeal = await meal.save();

        const populatedMeal = await Meal.findById(updatedMeal._id).populate(
            "foods.food",
            "name category servingSize servingUnit"
        );

        return res.status(200).json({
            success: true,
            message: "Meal updated successfully.",
            meal: populatedMeal
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to update meal.",
            error: error.message
        });
    }
};

// @desc    Delete meal
// @route   DELETE /api/meals/:id
// @access  Private
const deleteMeal = async (req, res) => {
    try {
        const meal = await Meal.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!meal) {
            return res.status(404).json({
                success: false,
                message: "Meal not found."
            });
        }

        await meal.deleteOne();

        return res.status(200).json({
            success: true,
            message: "Meal deleted successfully."
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to delete meal.",
            error: error.message
        });
    }
};

// @desc    Get daily nutrition summary
// @route   GET /api/meals/summary/daily?date=2026-06-22
// @access  Private
const getDailyNutritionSummary = async (req, res) => {
    try {
        const { date } = req.query;
        const { start, end } = getDateRange(date);

        const meals = await Meal.find({
            user: req.user._id,
            mealDate: {
                $gte: start,
                $lte: end
            }
        }).sort({ mealDate: 1 });

        const summary = {
            date: start.toISOString().split("T")[0],
            totalCalories: 0,
            totalProtein: 0,
            totalCarbs: 0,
            totalFat: 0,
            mealsCount: meals.length,
            breakfastCalories: 0,
            lunchCalories: 0,
            dinnerCalories: 0,
            snackCalories: 0
        };

        meals.forEach((meal) => {
            summary.totalCalories += meal.totalCalories;
            summary.totalProtein += meal.totalProtein;
            summary.totalCarbs += meal.totalCarbs;
            summary.totalFat += meal.totalFat;

            if (meal.mealType === "Breakfast") {
                summary.breakfastCalories += meal.totalCalories;
            }

            if (meal.mealType === "Lunch") {
                summary.lunchCalories += meal.totalCalories;
            }

            if (meal.mealType === "Dinner") {
                summary.dinnerCalories += meal.totalCalories;
            }

            if (meal.mealType === "Snack") {
                summary.snackCalories += meal.totalCalories;
            }
        });

        summary.totalCalories = roundNumber(summary.totalCalories);
        summary.totalProtein = roundNumber(summary.totalProtein);
        summary.totalCarbs = roundNumber(summary.totalCarbs);
        summary.totalFat = roundNumber(summary.totalFat);
        summary.breakfastCalories = roundNumber(summary.breakfastCalories);
        summary.lunchCalories = roundNumber(summary.lunchCalories);
        summary.dinnerCalories = roundNumber(summary.dinnerCalories);
        summary.snackCalories = roundNumber(summary.snackCalories);

        return res.status(200).json({
            success: true,
            summary,
            meals
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch daily nutrition summary.",
            error: error.message
        });
    }
};

module.exports = {
    createMeal,
    getUserMeals,
    getMealById,
    updateMeal,
    deleteMeal,
    getDailyNutritionSummary
};