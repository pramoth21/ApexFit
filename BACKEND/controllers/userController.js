const User = require("../models/User");

// @desc    Get current user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res) => {
    try {
        return res.status(200).json({
            success: true,
            user: req.user
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch profile.",
            error: error.message
        });
    }
};

// @desc    Update current user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
    try {
        const {
            fullName,
            age,
            gender,
            height,
            weight,
            goal,
            activityLevel
        } = req.body;

        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        if (fullName !== undefined) user.fullName = fullName;
        if (age !== undefined) user.age = age;
        if (gender !== undefined) user.gender = gender;
        if (height !== undefined) user.height = height;
        if (weight !== undefined) user.weight = weight;
        if (goal !== undefined) user.goal = goal;
        if (activityLevel !== undefined) user.activityLevel = activityLevel;

        user.profileCompleted =
            user.age &&
            user.gender &&
            user.height &&
            user.weight &&
            user.goal &&
            user.activityLevel
                ? true
                : false;

        const updatedUser = await user.save();

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully.",
            user: updatedUser
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to update profile.",
            error: error.message
        });
    }
};

// @desc    Change password
// @route   PUT /api/users/change-password
// @access  Private
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Current password and new password are required."
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: "New password must be at least 6 characters."
            });
        }

        const user = await User.findById(req.user._id);

        const isMatch = await user.matchPassword(currentPassword);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Current password is incorrect."
            });
        }

        user.password = newPassword;
        await user.save();

        return res.status(200).json({
            success: true,
            message: "Password changed successfully."
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to change password.",
            error: error.message
        });
    }
};

// @desc    Delete/deactivate own account
// @route   PUT /api/users/deactivate
// @access  Private
const deactivateAccount = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        user.isActive = false;
        await user.save();

        return res.status(200).json({
            success: true,
            message: "Account deactivated successfully."
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to deactivate account.",
            error: error.message
        });
    }
};

module.exports = {
    getUserProfile,
    updateUserProfile,
    changePassword,
    deactivateAccount
};