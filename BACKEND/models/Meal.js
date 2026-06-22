const mongoose = require("mongoose");

const mealFoodSchema = new mongoose.Schema(
    {
        food: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Food",
            required: true
        },

        foodName: {
            type: String,
            required: true
        },

        quantity: {
            type: Number,
            required: true,
            min: 1
        },

        servingUnit: {
            type: String,
            default: "g"
        },

        calories: {
            type: Number,
            required: true
        },

        protein: {
            type: Number,
            required: true
        },

        carbs: {
            type: Number,
            required: true
        },

        fat: {
            type: Number,
            required: true
        }
    },
    {
        _id: false
    }
);

const mealSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        mealType: {
            type: String,
            enum: ["Breakfast", "Lunch", "Dinner", "Snack"],
            required: true
        },

        foods: {
            type: [mealFoodSchema],
            required: true,
            validate: {
                validator: function (foods) {
                    return foods.length > 0;
                },
                message: "At least one food item is required"
            }
        },

        totalCalories: {
            type: Number,
            default: 0
        },

        totalProtein: {
            type: Number,
            default: 0
        },

        totalCarbs: {
            type: Number,
            default: 0
        },

        totalFat: {
            type: Number,
            default: 0
        },

        mealDate: {
            type: Date,
            default: Date.now
        },

        notes: {
            type: String,
            default: ""
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Meal", mealSchema);