const mongoose = require("mongoose");

const supplementSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Supplement name is required"],
            trim: true
        },

        brand: {
            type: String,
            trim: true,
            default: ""
        },

        description: {
            type: String,
            trim: true,
            default: ""
        },

        // Which fitness goals this supplement suits.
        // Matches your User.goal values, plus two extra categories
        // used for browsing/tagging (Endurance, General Health).
        goals: {
            type: [String],
            enum: [
                "Weight Loss",
                "Weight Gain",
                "Muscle Gain",
                "Maintenance",
                "Endurance",
                "General Health"
            ],
            default: []
        },

        // Which age groups this supplement is recommended for
        ageGroups: {
            type: [String],
            enum: ["13-25", "26-49", "50+"],
            default: []
        },

        benefits: {
            type: [String],
            default: []
        },

        precautions: {
            type: [String],
            default: []
        },

        dosage: {
            type: String,
            trim: true,
            default: ""
        },

        price: {
            type: Number,
            min: 0,
            default: null
        },

        // Relative path served via express.static, e.g. "/uploads/supplements/168123.jpg"
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

module.exports = mongoose.model("Supplement", supplementSchema);