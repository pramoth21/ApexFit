const Food = require("../models/Food");

// @desc    Create food
// @route   POST /api/foods
// @access  Private
const createFood = async (req, res) => {
    try {
        const {
            name,
            category,
            servingSize,
            servingUnit,
            calories,
            protein,
            carbs,
            fat,
            fiber,
            sugar,
            description
        } = req.body;

        if (!name || !servingSize || calories === undefined || protein === undefined || carbs === undefined || fat === undefined) {
            return res.status(400).json({
                success: false,
                message: "Name, serving size, calories, protein, carbs, and fat are required."
            });
        }

        const existingFood = await Food.findOne({
            name: { $regex: new RegExp(`^${name}$`, "i") }
        });

        if (existingFood) {
            return res.status(400).json({
                success: false,
                message: "Food already exists."
            });
        }

        const food = await Food.create({
            name,
            category,
            servingSize,
            servingUnit,
            calories,
            protein,
            carbs,
            fat,
            fiber,
            sugar,
            description,
            createdBy: req.user._id
        });

        return res.status(201).json({
            success: true,
            message: "Food created successfully.",
            food
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to create food.",
            error: error.message
        });
    }
};

// @desc    Get all foods
// @route   GET /api/foods
// @access  Private
const getFoods = async (req, res) => {
    try {
        const { search, category } = req.query;

        const query = { isActive: true };

        if (search) {
            query.name = { $regex: search, $options: "i" };
        }

        if (category) {
            query.category = category;
        }

        const foods = await Food.find(query).sort({ name: 1 });

        return res.status(200).json({
            success: true,
            count: foods.length,
            foods
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch foods.",
            error: error.message
        });
    }
};

// @desc    Get single food
// @route   GET /api/foods/:id
// @access  Private
const getFoodById = async (req, res) => {
    try {
        const food = await Food.findById(req.params.id);

        if (!food) {
            return res.status(404).json({
                success: false,
                message: "Food not found."
            });
        }

        return res.status(200).json({
            success: true,
            food
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch food.",
            error: error.message
        });
    }
};

// @desc    Update food
// @route   PUT /api/foods/:id
// @access  Private
const updateFood = async (req, res) => {
    try {
        const food = await Food.findById(req.params.id);

        if (!food) {
            return res.status(404).json({
                success: false,
                message: "Food not found."
            });
        }

        const fields = [
            "name",
            "category",
            "servingSize",
            "servingUnit",
            "calories",
            "protein",
            "carbs",
            "fat",
            "fiber",
            "sugar",
            "description",
            "isActive"
        ];

        fields.forEach((field) => {
            if (req.body[field] !== undefined) {
                food[field] = req.body[field];
            }
        });

        const updatedFood = await food.save();

        return res.status(200).json({
            success: true,
            message: "Food updated successfully.",
            food: updatedFood
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to update food.",
            error: error.message
        });
    }
};

// @desc    Delete/deactivate food
// @route   DELETE /api/foods/:id
// @access  Private
const deleteFood = async (req, res) => {
    try {
        const food = await Food.findById(req.params.id);

        if (!food) {
            return res.status(404).json({
                success: false,
                message: "Food not found."
            });
        }

        food.isActive = false;
        await food.save();

        return res.status(200).json({
            success: true,
            message: "Food removed successfully."
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to remove food.",
            error: error.message
        });
    }
};

// @desc    Seed real-world starter food data
// @route   POST /api/foods/seed
// @access  Private
const seedFoods = async (req, res) => {
    try {
        const starterFoods = [
            {
                name: "Chicken Breast",
                category: "Protein",
                servingSize: 100,
                servingUnit: "g",
                calories: 165,
                protein: 31,
                carbs: 0,
                fat: 3.6,
                description: "Cooked skinless chicken breast per 100g"
            },
            {
                name: "White Rice",
                category: "Carbohydrate",
                servingSize: 100,
                servingUnit: "g",
                calories: 130,
                protein: 2.7,
                carbs: 28,
                fat: 0.3,
                description: "Cooked white rice per 100g"
            },
            {
                name: "Brown Rice",
                category: "Carbohydrate",
                servingSize: 100,
                servingUnit: "g",
                calories: 111,
                protein: 2.6,
                carbs: 23,
                fat: 0.9,
                description: "Cooked brown rice per 100g"
            },
            {
                name: "Boiled Egg",
                category: "Protein",
                servingSize: 1,
                servingUnit: "egg",
                calories: 78,
                protein: 6.3,
                carbs: 0.6,
                fat: 5.3,
                description: "One medium/large boiled egg"
            },
            {
                name: "Oats",
                category: "Carbohydrate",
                servingSize: 100,
                servingUnit: "g",
                calories: 389,
                protein: 16.9,
                carbs: 66.3,
                fat: 6.9,
                fiber: 10.6,
                description: "Raw rolled oats per 100g"
            },
            {
                name: "Banana",
                category: "Fruit",
                servingSize: 1,
                servingUnit: "medium",
                calories: 105,
                protein: 1.3,
                carbs: 27,
                fat: 0.4,
                fiber: 3.1,
                sugar: 14.4,
                description: "One medium banana"
            },
            {
                name: "Fresh Milk",
                category: "Dairy",
                servingSize: 250,
                servingUnit: "ml",
                calories: 150,
                protein: 8,
                carbs: 12,
                fat: 8,
                description: "Whole milk per 250ml"
            },
            {
                name: "Low Fat Milk",
                category: "Dairy",
                servingSize: 250,
                servingUnit: "ml",
                calories: 105,
                protein: 8.5,
                carbs: 12,
                fat: 2.5,
                description: "Low fat milk per 250ml"
            },
            {
                name: "Whey Protein",
                category: "Protein",
                servingSize: 30,
                servingUnit: "g",
                calories: 120,
                protein: 24,
                carbs: 3,
                fat: 2,
                description: "Average whey protein scoop"
            },
            {
                name: "Peanut Butter",
                category: "Fat",
                servingSize: 32,
                servingUnit: "g",
                calories: 190,
                protein: 8,
                carbs: 7,
                fat: 16,
                description: "Two tablespoons peanut butter"
            },
            {
                name: "Tuna",
                category: "Protein",
                servingSize: 100,
                servingUnit: "g",
                calories: 132,
                protein: 28,
                carbs: 0,
                fat: 1,
                description: "Tuna in water per 100g"
            },
            {
                name: "Salmon",
                category: "Protein",
                servingSize: 100,
                servingUnit: "g",
                calories: 208,
                protein: 20,
                carbs: 0,
                fat: 13,
                description: "Cooked salmon per 100g"
            },
            {
                name: "Potato",
                category: "Carbohydrate",
                servingSize: 100,
                servingUnit: "g",
                calories: 87,
                protein: 1.9,
                carbs: 20,
                fat: 0.1,
                description: "Boiled potato per 100g"
            },
            {
                name: "Sweet Potato",
                category: "Carbohydrate",
                servingSize: 100,
                servingUnit: "g",
                calories: 86,
                protein: 1.6,
                carbs: 20,
                fat: 0.1,
                fiber: 3,
                description: "Cooked sweet potato per 100g"
            },
            {
                name: "Broccoli",
                category: "Vegetable",
                servingSize: 100,
                servingUnit: "g",
                calories: 35,
                protein: 2.4,
                carbs: 7.2,
                fat: 0.4,
                fiber: 3.3,
                description: "Cooked broccoli per 100g"
            }
        ];

        let insertedCount = 0;
        let skippedCount = 0;

        for (const foodData of starterFoods) {
            const exists = await Food.findOne({
                name: { $regex: new RegExp(`^${foodData.name}$`, "i") }
            });

            if (exists) {
                skippedCount++;
            } else {
                await Food.create({
                    ...foodData,
                    createdBy: req.user._id
                });
                insertedCount++;
            }
        }

        return res.status(201).json({
            success: true,
            message: "Starter foods seeded successfully.",
            insertedCount,
            skippedCount
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to seed foods.",
            error: error.message
        });
    }
};

module.exports = {
    createFood,
    getFoods,
    getFoodById,
    updateFood,
    deleteFood,
    seedFoods
};