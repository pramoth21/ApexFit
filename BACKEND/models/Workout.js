const mongoose = require("mongoose");

const workoutSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        exercise: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Exercise",
            required: true
        },

        exerciseName: {
            type: String,
            required: true,
            trim: true
        },

        category: {
            type: String,
            enum: ["Cardio", "Strength", "Flexibility", "Balance", "Sports", "Other"],
            default: "Other"
        },

        duration: {
            type: Number,
            required: true,
            min: 1
        },

        caloriesBurned: {
            type: Number,
            required: true,
            min: 0
        },

        caloriePredictionSource: {
            type: String,
            enum: ["Formula", "ML Model", "Manual"],
            default: "Formula"
        },

        intensity: {
            type: String,
            enum: ["Low", "Medium", "High"],
            default: "Medium"
        },

        sets: {
            type: Number,
            default: 0
        },

        reps: {
            type: Number,
            default: 0
        },

        weightUsed: {
            type: Number,
            default: 0
        },

        distance: {
            type: Number,
            default: 0
        },

        distanceUnit: {
            type: String,
            enum: ["km", "miles", "meters", "none"],
            default: "none"
        },

        workoutDate: {
            type: Date,
            default: Date.now
        },

        notes: {
            type: String,
            trim: true,
            default: ""
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Workout", workoutSchema);