const fs = require("fs");
const path = require("path");
const Supplement = require("../models/Supplement");

const deleteImageFile = (imagePath) => {
    if (!imagePath) return;

    const filename = imagePath.split("/").pop();
    const fullPath = path.join(__dirname, "..", "uploads", "supplements", filename);

    fs.unlink(fullPath, (err) => {
        if (err && err.code !== "ENOENT") {
            console.log("Failed to delete old image:", err.message);
        }
    });
};

const parseArrayField = (value) => {
    // Supports both actual arrays (JSON body) and comma-separated
    // strings (form-data, since form-data can't send real arrays easily)
    if (!value) return [];
    if (Array.isArray(value)) return value;
    return value.split(",").map((item) => item.trim()).filter(Boolean);
};

// Turns a user's age into the age-group bucket used for matching
const getAgeGroup = (age) => {
    if (!age) return null;
    if (age >= 13 && age <= 25) return "13-25";
    if (age >= 26 && age <= 49) return "26-49";
    if (age >= 50) return "50+";
    return null;
};

// @desc    Create a new supplement (admin only)
// @route   POST /api/supplements
// @access  Private/Admin
const createSupplement = async (req, res) => {
    try {
        const { name, brand, description, goals, ageGroups, benefits, precautions, dosage, price } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Supplement name is required."
            });
        }

        const supplement = await Supplement.create({
            name,
            brand,
            description,
            goals: parseArrayField(goals),
            ageGroups: parseArrayField(ageGroups),
            benefits: parseArrayField(benefits),
            precautions: parseArrayField(precautions),
            dosage,
            price: price || null,
            image: req.file ? `/uploads/supplements/${req.file.filename}` : null,
            createdBy: req.user._id
        });

        return res.status(201).json({
            success: true,
            message: "Supplement created successfully.",
            supplement
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to create supplement.",
            error: error.message
        });
    }
};

// @desc    Get all supplements (with optional filters, for browsing/admin panel)
// @route   GET /api/supplements?goal=&ageGroup=&search=
// @access  Public
const getAllSupplements = async (req, res) => {
    try {
        const { goal, ageGroup, search } = req.query;

        const query = {};

        if (goal) query.goals = goal;
        if (ageGroup) query.ageGroups = ageGroup;
        if (search) query.name = { $regex: search, $options: "i" };

        const supplements = await Supplement.find(query).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: supplements.length,
            supplements
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch supplements.",
            error: error.message
        });
    }
};

// @desc    Get a single supplement
// @route   GET /api/supplements/:id
// @access  Public
const getSupplementById = async (req, res) => {
    try {
        const supplement = await Supplement.findById(req.params.id);

        if (!supplement) {
            return res.status(404).json({
                success: false,
                message: "Supplement not found."
            });
        }

        return res.status(200).json({
            success: true,
            supplement
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch supplement.",
            error: error.message
        });
    }
};

// @desc    Update a supplement (admin only)
// @route   PUT /api/supplements/:id
// @access  Private/Admin
const updateSupplement = async (req, res) => {
    try {
        const supplement = await Supplement.findById(req.params.id);

        if (!supplement) {
            return res.status(404).json({
                success: false,
                message: "Supplement not found."
            });
        }

        const { name, brand, description, goals, ageGroups, benefits, precautions, dosage, price, isActive } = req.body;

        if (name !== undefined) supplement.name = name;
        if (brand !== undefined) supplement.brand = brand;
        if (description !== undefined) supplement.description = description;
        if (goals !== undefined) supplement.goals = parseArrayField(goals);
        if (ageGroups !== undefined) supplement.ageGroups = parseArrayField(ageGroups);
        if (benefits !== undefined) supplement.benefits = parseArrayField(benefits);
        if (precautions !== undefined) supplement.precautions = parseArrayField(precautions);
        if (dosage !== undefined) supplement.dosage = dosage;
        if (price !== undefined) supplement.price = price;
        if (isActive !== undefined) supplement.isActive = isActive;

        // If a new image was uploaded, replace the old one and delete the old file
        if (req.file) {
            deleteImageFile(supplement.image);
            supplement.image = `/uploads/supplements/${req.file.filename}`;
        }

        const updatedSupplement = await supplement.save();

        return res.status(200).json({
            success: true,
            message: "Supplement updated successfully.",
            supplement: updatedSupplement
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to update supplement.",
            error: error.message
        });
    }
};

// @desc    Delete a supplement (admin only)
// @route   DELETE /api/supplements/:id
// @access  Private/Admin
const deleteSupplement = async (req, res) => {
    try {
        const supplement = await Supplement.findById(req.params.id);

        if (!supplement) {
            return res.status(404).json({
                success: false,
                message: "Supplement not found."
            });
        }

        deleteImageFile(supplement.image);
        await supplement.deleteOne();

        return res.status(200).json({
            success: true,
            message: "Supplement deleted successfully."
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to delete supplement.",
            error: error.message
        });
    }
};

// @desc    Get rule-based supplement recommendations for the logged-in user
// @route   GET /api/supplements/recommendations
// @access  Private
const getMyRecommendations = async (req, res) => {
    try {
        const user = req.user;
        const ageGroup = getAgeGroup(user.age);

        if (!user.goal && !ageGroup) {
            return res.status(400).json({
                success: false,
                message: "Complete your profile (age and goal) to get supplement recommendations."
            });
        }

        const orConditions = [];
        if (user.goal) orConditions.push({ goals: user.goal });
        if (ageGroup) orConditions.push({ ageGroups: ageGroup });

        const matchedSupplements = await Supplement.find({
            isActive: true,
            $or: orConditions
        });

        // Score each result: matches both goal AND age group = higher relevance
        const scored = matchedSupplements.map((supplement) => {
            const matchedBy = [];
            if (user.goal && supplement.goals.includes(user.goal)) matchedBy.push("goal");
            if (ageGroup && supplement.ageGroups.includes(ageGroup)) matchedBy.push("age");

            return {
                supplement,
                matchedBy,
                matchScore: matchedBy.length
            };
        });

        scored.sort((a, b) => b.matchScore - a.matchScore);

        return res.status(200).json({
            success: true,
            basedOn: {
                goal: user.goal || null,
                ageGroup: ageGroup || null
            },
            count: scored.length,
            recommendations: scored
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to get supplement recommendations.",
            error: error.message
        });
    }
};

module.exports = {
    createSupplement,
    getAllSupplements,
    getSupplementById,
    updateSupplement,
    deleteSupplement,
    getMyRecommendations
};