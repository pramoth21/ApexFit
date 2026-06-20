const calculateBMI = (weight, height) => {
    if (!weight || !height) return null;

    const heightInMeters = height / 100;
    return Number((weight / (heightInMeters * heightInMeters)).toFixed(2));
};

const getBMICategory = (bmi) => {
    if (!bmi) return "Not available";

    if (bmi < 18.5) return "Underweight";
    if (bmi < 25) return "Normal";
    if (bmi < 30) return "Overweight";
    return "Obese";
};

const calculateBMR = (user) => {
    const { gender, weight, height, age } = user;

    if (!gender || !weight || !height || !age) return null;

    if (gender === "Male") {
        return Math.round(10 * weight + 6.25 * height - 5 * age + 5);
    }

    if (gender === "Female") {
        return Math.round(10 * weight + 6.25 * height - 5 * age - 161);
    }

    return Math.round(10 * weight + 6.25 * height - 5 * age);
};

const getActivityMultiplier = (activityLevel) => {
    const multipliers = {
        Sedentary: 1.2,
        Light: 1.375,
        Moderate: 1.55,
        Active: 1.725,
        "Very Active": 1.9
    };

    return multipliers[activityLevel] || 1.55;
};

const calculateDailyCalories = (user) => {
    const bmr = calculateBMR(user);

    if (!bmr) return null;

    const maintenanceCalories = Math.round(
        bmr * getActivityMultiplier(user.activityLevel)
    );

    let recommendedCalories = maintenanceCalories;

    if (user.goal === "Weight Loss") {
        recommendedCalories = maintenanceCalories - 400;
    }

    if (user.goal === "Weight Gain") {
        recommendedCalories = maintenanceCalories + 400;
    }

    if (user.goal === "Muscle Gain") {
        recommendedCalories = maintenanceCalories + 250;
    }

    if (user.goal === "Maintenance") {
        recommendedCalories = maintenanceCalories;
    }

    return {
        bmr,
        maintenanceCalories,
        recommendedCalories
    };
};

const getAgeGroup = (age) => {
    if (!age) return "Not available";
    if (age >= 13 && age <= 25) return "Youth";
    if (age >= 26 && age <= 49) return "Adult";
    return "Senior";
};

const getBasicRecommendations = (user) => {
    const recommendations = [];

    if (user.goal === "Weight Loss") {
        recommendations.push("Focus on a calorie deficit with high-protein meals.");
        recommendations.push("Add cardio workouts 3-5 times per week.");
        recommendations.push("Track daily calories consistently.");
    }

    if (user.goal === "Weight Gain") {
        recommendations.push("Eat in a calorie surplus with nutrient-dense foods.");
        recommendations.push("Increase meal frequency if appetite is low.");
        recommendations.push("Focus on progressive strength training.");
    }

    if (user.goal === "Muscle Gain") {
        recommendations.push("Maintain a small calorie surplus.");
        recommendations.push("Consume enough protein daily.");
        recommendations.push("Prioritize compound lifts and recovery.");
    }

    if (user.goal === "Maintenance") {
        recommendations.push("Keep calories close to maintenance level.");
        recommendations.push("Balance strength training and cardio.");
        recommendations.push("Monitor weekly weight changes.");
    }

    if (user.age >= 50) {
        recommendations.push("Include calcium, vitamin D, and joint-friendly activities.");
    }

    if (recommendations.length === 0) {
        recommendations.push("Complete your profile to receive personalized recommendations.");
    }

    return recommendations;
};

// @desc    Get user dashboard
// @route   GET /api/dashboard
// @access  Private
const getDashboard = async (req, res) => {
    try {
        const user = req.user;

        const bmi = calculateBMI(user.weight, user.height);
        const calories = calculateDailyCalories(user);
        const ageGroup = getAgeGroup(user.age);

        return res.status(200).json({
            success: true,
            message: "Dashboard data fetched successfully.",
            dashboard: {
                user: {
                    fullName: user.fullName,
                    email: user.email,
                    age: user.age,
                    gender: user.gender,
                    height: user.height,
                    weight: user.weight,
                    goal: user.goal,
                    activityLevel: user.activityLevel,
                    role: user.role,
                    profileCompleted: user.profileCompleted
                },

                healthSummary: {
                    bmi,
                    bmiCategory: getBMICategory(bmi),
                    ageGroup
                },

                calorieSummary: calories || {
                    bmr: null,
                    maintenanceCalories: null,
                    recommendedCalories: null
                },

                todaySummary: {
                    caloriesConsumed: 0,
                    caloriesRemaining: calories
                        ? calories.recommendedCalories
                        : 0,
                    proteinConsumed: 0,
                    carbsConsumed: 0,
                    fatConsumed: 0,
                    workoutsCompleted: 0,
                    waterIntakeLiters: 0
                },

                recommendations: getBasicRecommendations(user)
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch dashboard.",
            error: error.message
        });
    }
};

module.exports = {
    getDashboard
};