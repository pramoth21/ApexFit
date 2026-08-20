const mongoose = require("mongoose");

const recipeSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Recipe name is required"],
            trim: true
        },

        description: {
            type: String,
            trim: true,
            default: ""
        },

        ingredients: {
            type: [String],
            default: []
        },

        instructions: {
            type: [String],
            default: []
        },

        // Nutrition values are PER SERVING
        calories: {
            type: Number,
            required: [true, "Calories are required"],
            min: 0
        },

        protein: {
            type: Number,
            required: [true, "Protein is required"],
            min: 0
        },

        carbs: {
            type: Number,
            required: [true, "Carbs are required"],
            min: 0
        },

        fat: {
            type: Number,
            required: [true, "Fat is required"],
            min: 0
        },

        servings: {
            type: Number,
            default: 1,
            min: 1
        },

        prepTime: {
            type: Number, // minutes
            default: null
        },

        // Used for filtering: Weight Loss / Muscle Gain / Senior
        tags: {
            type: [String],
            enum: [
                "Weight Loss",
                "Weight Gain",
                "Muscle Gain",
                "Maintenance",
                "Senior",
                "General Health"
            ],
            default: []
        },

        // Relative path served via express.static, e.g. "/uploads/recipes/168123.jpg"
        image: {
            type: String,
            default: null
        },

        isActive: {
            type: Boolean,
            default: true
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Recipe", recipeSchema);