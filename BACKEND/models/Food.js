const mongoose = require("mongoose");

const foodSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Food name is required"],
            trim: true,
            unique: true
        },

        category: {
            type: String,
            enum: [
                "Protein",
                "Carbohydrate",
                "Fat",
                "Fruit",
                "Vegetable",
                "Dairy",
                "Beverage",
                "Snack",
                "Other"
            ],
            default: "Other"
        },

        servingSize: {
            type: Number,
            required: [true, "Serving size is required"]
        },

        servingUnit: {
            type: String,
            default: "g"
        },

        calories: {
            type: Number,
            required: [true, "Calories are required"]
        },

        protein: {
            type: Number,
            required: [true, "Protein amount is required"]
        },

        carbs: {
            type: Number,
            required: [true, "Carbs amount is required"]
        },

        fat: {
            type: Number,
            required: [true, "Fat amount is required"]
        },

        fiber: {
            type: Number,
            default: 0
        },

        sugar: {
            type: Number,
            default: 0
        },

        description: {
            type: String,
            default: ""
        },

        isActive: {
            type: Boolean,
            default: true
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Food", foodSchema);