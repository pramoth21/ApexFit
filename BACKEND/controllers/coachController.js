const fs = require("fs");
const path = require("path");
const CoachProfile = require("../models/CoachProfile");
const User = require("../models/User");

const deleteImageFile = (imagePath) => {
    if (!imagePath) return;
    const filename = imagePath.split("/").pop();
    const fullPath = path.join(__dirname, "..", "uploads", "coaches", filename);
    fs.unlink(fullPath, (err) => {
        if (err && err.code !== "ENOENT") {
            console.log("Failed to delete old coach image:", err.message);
        }
    });
};

const parseArrayField = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    return value.split(",").map((item) => item.trim()).filter(Boolean);
};

// @desc    Register as a coach (creates profile + upgrades role to "coach")
// @route   POST /api/coaches/register
// @access  Private
const registerAsCoach = async (req, res) => {
    try {
        const existingProfile = await CoachProfile.findOne({ user: req.user._id });
        if (existingProfile) {
            return res.status(400).json({
                success: false,
                message: "You already have a coach profile. Use the update endpoint instead."
            });
        }

        const { bio, specializations, experienceYears, pricePerSession, certifications, availability } = req.body;

        if (!pricePerSession) {
            return res.status(400).json({
                success: false,
                message: "pricePerSession is required."
            });
        }

        const profileImage = req.files && req.files.profileImage
            ? `/uploads/coaches/${req.files.profileImage[0].filename}`
            : null;

        const galleryImages = req.files && req.files.galleryImages
            ? req.files.galleryImages.map((file) => `/uploads/coaches/${file.filename}`)
            : [];

        const coachProfile = await CoachProfile.create({
            user: req.user._id,
            bio,
            specializations: parseArrayField(specializations),
            experienceYears: experienceYears || 0,
            pricePerSession,
            certifications: parseArrayField(certifications),
            availability: parseArrayField(availability),
            profileImage,
            galleryImages
        });

        await User.findByIdAndUpdate(req.user._id, { role: "coach" });

        return res.status(201).json({
            success: true,
            message: "Coach registration successful. Your account has been upgraded to a coach.",
            coachProfile
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to register as coach.",
            error: error.message
        });
    }
};

// @desc    Update own coach profile
// @route   PUT /api/coaches/profile
// @access  Private/Coach
const updateMyCoachProfile = async (req, res) => {
    try {
        const coachProfile = await CoachProfile.findOne({ user: req.user._id });

        if (!coachProfile) {
            return res.status(404).json({
                success: false,
                message: "Coach profile not found. Register as a coach first."
            });
        }

        const { bio, specializations, experienceYears, pricePerSession, certifications, availability, isActive } = req.body;

        if (bio !== undefined) coachProfile.bio = bio;
        if (specializations !== undefined) coachProfile.specializations = parseArrayField(specializations);
        if (experienceYears !== undefined) coachProfile.experienceYears = experienceYears;
        if (pricePerSession !== undefined) coachProfile.pricePerSession = pricePerSession;
        if (certifications !== undefined) coachProfile.certifications = parseArrayField(certifications);
        if (availability !== undefined) coachProfile.availability = parseArrayField(availability);
        if (isActive !== undefined) coachProfile.isActive = isActive;

        if (req.files && req.files.profileImage) {
            deleteImageFile(coachProfile.profileImage);
            coachProfile.profileImage = `/uploads/coaches/${req.files.profileImage[0].filename}`;
        }

        if (req.files && req.files.galleryImages) {
            // New gallery upload replaces the old set (keeps things simple)
            coachProfile.galleryImages.forEach((img) => deleteImageFile(img));
            coachProfile.galleryImages = req.files.galleryImages.map((file) => `/uploads/coaches/${file.filename}`);
        }

        const updatedProfile = await coachProfile.save();

        return res.status(200).json({
            success: true,
            message: "Coach profile updated successfully.",
            coachProfile: updatedProfile
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to update coach profile.",
            error: error.message
        });
    }
};

// @desc    Get own coach profile (for coach dashboard)
// @route   GET /api/coaches/me
// @access  Private/Coach
const getMyCoachProfile = async (req, res) => {
    try {
        const coachProfile = await CoachProfile.findOne({ user: req.user._id }).populate("user", "name email");

        if (!coachProfile) {
            return res.status(404).json({
                success: false,
                message: "Coach profile not found."
            });
        }

        return res.status(200).json({
            success: true,
            coachProfile
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch coach profile.",
            error: error.message
        });
    }
};

// @desc    Discover/browse coaches, with filters
// @route   GET /api/coaches?specialization=&minPrice=&maxPrice=&search=&sort=
// @access  Public
const getAllCoaches = async (req, res) => {
    try {
        const { specialization, minPrice, maxPrice, sort } = req.query;

        const query = { isActive: true };

        if (specialization) query.specializations = specialization;

        if (minPrice || maxPrice) {
            query.pricePerSession = {};
            if (minPrice) query.pricePerSession.$gte = Number(minPrice);
            if (maxPrice) query.pricePerSession.$lte = Number(maxPrice);
        }

        let sortOption = { "rating.average": -1 }; // default: best rated first
        if (sort === "priceLowToHigh") sortOption = { pricePerSession: 1 };
        if (sort === "priceHighToLow") sortOption = { pricePerSession: -1 };
        if (sort === "experience") sortOption = { experienceYears: -1 };

        const coaches = await CoachProfile.find(query)
            .populate("user", "name email")
            .sort(sortOption);

        return res.status(200).json({
            success: true,
            count: coaches.length,
            coaches
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch coaches.",
            error: error.message
        });
    }
};

// @desc    Get a single coach's public profile
// @route   GET /api/coaches/:id
// @access  Public
const getCoachById = async (req, res) => {
    try {
        const coach = await CoachProfile.findById(req.params.id).populate("user", "name email");

        if (!coach) {
            return res.status(404).json({
                success: false,
                message: "Coach not found."
            });
        }

        return res.status(200).json({
            success: true,
            coach
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch coach.",
            error: error.message
        });
    }
};

module.exports = {
    registerAsCoach,
    updateMyCoachProfile,
    getMyCoachProfile,
    getAllCoaches,
    getCoachById
};