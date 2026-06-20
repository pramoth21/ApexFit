const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: [true, "Full name is required"],
            trim: true
        },

        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true
        },

        password: {
            type: String,
            required: [true, "Password is required"],
            minlength: [6, "Password must be at least 6 characters"]
        },

        age: {
            type: Number,
            min: 13
        },

        gender: {
            type: String,
            enum: ["Male", "Female", "Other"]
        },

        height: {
            type: Number
        },

        weight: {
            type: Number
        },

        goal: {
            type: String,
            enum: ["Weight Loss", "Weight Gain", "Muscle Gain", "Maintenance"]
        },

        activityLevel: {
            type: String,
            enum: ["Sedentary", "Light", "Moderate", "Active", "Very Active"],
            default: "Moderate"
        },

        role: {
            type: String,
            enum: ["user", "coach", "admin"],
            default: "user"
        },

        profileCompleted: {
            type: Boolean,
            default: false
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

// Correct password hashing
userSchema.pre("save", async function () {
    if (!this.isModified("password")) {
        return;
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Compare password during login
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Hide password from response
userSchema.methods.toJSON = function () {
    const user = this.toObject();
    delete user.password;
    return user;
};

module.exports = mongoose.model("User", userSchema);