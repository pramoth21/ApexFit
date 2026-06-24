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
            required: true
        },

        category: {
            type: String,
            default: "Other"
        },

        duration: {
            type: Number,
            required: [true, "Workout duration is required"],
            min: [1, "Duration must be at least 1 minute"]
        },

        caloriesBurned: {
            type: Number,
            required: true,
            min: 0
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
            enum: ["km", "miles", "none"],
            default: "none"
        },

        workoutDate: {
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

module.exports = mongoose.model("Workout", workoutSchema);