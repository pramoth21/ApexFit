const mongoose = require("mongoose");

const coachProfileSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true
        },

        bio: {
            type: String,
            trim: true,
            default: ""
        },

        // Open-ended so coaches can describe their own niche
        // e.g. "Weight Loss", "Bodybuilding", "Yoga", "Sports Nutrition"
        specializations: {
            type: [String],
            default: []
        },

        experienceYears: {
            type: Number,
            min: 0,
            default: 0
        },

        pricePerSession: {
            type: Number,
            required: [true, "Price per session is required"],
            min: 0
        },

        certifications: {
            type: [String],
            default: []
        },

        availability: {
            type: [String], // e.g. ["Monday", "Wednesday", "Friday"]
            default: []
        },

        profileImage: {
            type: String, // "/uploads/coaches/xxxx.jpg"
            default: null
        },

        galleryImages: {
            type: [String], // up to 4 extra photos
            default: []
        },

        rating: {
            average: { type: Number, default: 0, min: 0, max: 5 },
            totalReviews: { type: Number, default: 0 }
        },

        totalClients: {
            type: Number,
            default: 0
        },

        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("CoachProfile", coachProfileSchema);