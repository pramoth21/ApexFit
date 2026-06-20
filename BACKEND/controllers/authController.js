const jwt = require("jsonwebtoken");
const User = require("../models/User");

const generateAccessToken = (userId) => {
    return jwt.sign(
        { id: userId },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRE || "1d"
        }
    );
};

const generateRefreshToken = (userId) => {
    return jwt.sign(
        { id: userId },
        process.env.JWT_REFRESH_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRE || "7d"
        }
    );
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    try {
        const {
            fullName,
            email,
            password,
            age,
            gender,
            height,
            weight,
            goal,
            activityLevel
        } = req.body;

        if (!fullName || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Full name, email, and password are required."
            });
        }

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "User already exists with this email."
            });
        }

        const profileCompleted =
            age && gender && height && weight && goal && activityLevel
                ? true
                : false;

        const user = await User.create({
            fullName,
            email,
            password,
            age,
            gender,
            height,
            weight,
            goal,
            activityLevel,
            profileCompleted
        });

        const accessToken = generateAccessToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        return res.status(201).json({
            success: true,
            message: "User registered successfully.",
            accessToken,
            refreshToken,
            user
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Registration failed.",
            error: error.message
        });
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required."
            });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        const isMatch = await user.matchPassword(password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: "Your account has been disabled."
            });
        }

        const accessToken = generateAccessToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        return res.status(200).json({
            success: true,
            message: "Login successful.",
            accessToken,
            refreshToken,
            user
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Login failed.",
            error: error.message
        });
    }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh-token
// @access  Public
const refreshAccessToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                message: "Refresh token is required."
            });
        }

        const decoded = jwt.verify(
            refreshToken,
            process.env.JWT_REFRESH_SECRET
        );

        const user = await User.findById(decoded.id).select("-password");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        const newAccessToken = generateAccessToken(user._id);

        return res.status(200).json({
            success: true,
            message: "Access token refreshed.",
            accessToken: newAccessToken
        });
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired refresh token."
        });
    }
};

// @desc    Get logged-in user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
    return res.status(200).json({
        success: true,
        user: req.user
    });
};

module.exports = {
    registerUser,
    loginUser,
    refreshAccessToken,
    getMe
};