const mongoose = require("mongoose");

const weightLogSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        weight: {
            type: Number,
            required: [true, "Weight is required"],
            min: [20, "Weight must be realistic"],
            max: [300, "Weight must be realistic"]
        },

        bodyFatPercentage: {
            type: Number,
            default: null,
            min: 0,
            max: 100
        },

        waist: {
            type: Number,
            default: null
        },

        chest: {
            type: Number,
            default: null
        },

        arms: {
            type: Number,
            default: null
        },

        thighs: {
            type: Number,
            default: null
        },

        unit: {
            type: String,
            enum: ["kg", "lb"],
            default: "kg"
        },

        logDate: {
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

weightLogSchema.index({ user: 1, logDate: -1 });

module.exports = mongoose.model("WeightLog", weightLogSchema);