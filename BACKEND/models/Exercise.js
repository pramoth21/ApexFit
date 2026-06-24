const mongoose = require("mongoose");

const exerciseSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Exercise name is required"],
            trim: true,
            unique: true
        },

        category: {
            type: String,
            enum: [
                "Cardio",
                "Strength",
                "Flexibility",
                "Balance",
                "Sports",
                "Other"
            ],
            default: "Other"
        },

        targetMuscle: {
            type: String,
            default: "Full Body"
        },

        difficulty: {
            type: String,
            enum: ["Beginner", "Intermediate", "Advanced"],
            default: "Beginner"
        },

        // Estimated calories burned per minute for average user.
        // Later you can improve using MET values + user weight.
        caloriesBurnedPerMinute: {
            type: Number,
            required: [true, "Calories burned per minute is required"],
            min: 0
        },

        instructions: {
            type: String,
            default: ""
        },

        equipment: {
            type: String,
            default: "None"
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

module.exports = mongoose.model("Exercise", exerciseSchema);