const Meal = require("../models/Meal");

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

const getBasicRecommendations = (user, nutritionSummary, calories) => {
    const recommendations = [];

    if (!user.profileCompleted) {
        recommendations.push("Complete your profile to receive personalized recommendations.");
        return recommendations;
    }

    if (calories && nutritionSummary.totalCalories > calories.recommendedCalories) {
        recommendations.push("You exceeded your calorie target today. Reduce high-calorie snacks.");
    }

    if (calories && nutritionSummary.totalCalories < calories.recommendedCalories * 0.7) {
        recommendations.push("Your calorie intake is low today. Add a balanced meal or protein source.");
    }

    if (nutritionSummary.totalProtein < 80 && user.goal === "Muscle Gain") {
        recommendations.push("Protein intake is low for muscle gain. Add chicken, eggs, fish, milk, or whey.");
    }

    if (user.goal === "Weight Loss") {
        recommendations.push("Focus on lean protein, vegetables, and controlled carbohydrate portions.");
    }

    if (user.goal === "Muscle Gain") {
        recommendations.push("Maintain a small calorie surplus and keep protein consistent.");
    }

    if (user.age >= 50) {
        recommendations.push("Include calcium, vitamin D, omega-3, and joint-friendly foods.");
    }

    if (recommendations.length === 0) {
        recommendations.push("Good progress. Keep logging meals daily for better recommendations.");
    }

    return recommendations;
};

const getTodayDateRange = () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    return { start, end };
};

const roundNumber = (num) => {
    return Number(num.toFixed(2));
};

const getTodayNutritionSummary = async (userId) => {
    const { start, end } = getTodayDateRange();

    const meals = await Meal.find({
        user: userId,
        mealDate: {
            $gte: start,
            $lte: end
        }
    }).sort({ mealDate: 1 });

    const summary = {
        totalCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFat: 0,
        mealsLogged: meals.length,
        breakfastCalories: 0,
        lunchCalories: 0,
        dinnerCalories: 0,
        snackCalories: 0
    };

    meals.forEach((meal) => {
        summary.totalCalories += meal.totalCalories;
        summary.totalProtein += meal.totalProtein;
        summary.totalCarbs += meal.totalCarbs;
        summary.totalFat += meal.totalFat;

        if (meal.mealType === "Breakfast") {
            summary.breakfastCalories += meal.totalCalories;
        }

        if (meal.mealType === "Lunch") {
            summary.lunchCalories += meal.totalCalories;
        }

        if (meal.mealType === "Dinner") {
            summary.dinnerCalories += meal.totalCalories;
        }

        if (meal.mealType === "Snack") {
            summary.snackCalories += meal.totalCalories;
        }
    });

    return {
        totalCalories: roundNumber(summary.totalCalories),
        totalProtein: roundNumber(summary.totalProtein),
        totalCarbs: roundNumber(summary.totalCarbs),
        totalFat: roundNumber(summary.totalFat),
        mealsLogged: summary.mealsLogged,
        breakfastCalories: roundNumber(summary.breakfastCalories),
        lunchCalories: roundNumber(summary.lunchCalories),
        dinnerCalories: roundNumber(summary.dinnerCalories),
        snackCalories: roundNumber(summary.snackCalories),
        meals
    };
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
        const nutritionSummary = await getTodayNutritionSummary(user._id);

        const recommendedCalories = calories ? calories.recommendedCalories : 0;
        const caloriesRemaining = recommendedCalories - nutritionSummary.totalCalories;

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

                nutritionCards: {
                    caloriesConsumed: nutritionSummary.totalCalories,
                    caloriesRemaining,
                    proteinConsumed: nutritionSummary.totalProtein,
                    carbsConsumed: nutritionSummary.totalCarbs,
                    fatConsumed: nutritionSummary.totalFat,
                    mealsLogged: nutritionSummary.mealsLogged
                },

                mealBreakdown: {
                    breakfastCalories: nutritionSummary.breakfastCalories,
                    lunchCalories: nutritionSummary.lunchCalories,
                    dinnerCalories: nutritionSummary.dinnerCalories,
                    snackCalories: nutritionSummary.snackCalories
                },

                todayMeals: nutritionSummary.meals,

                recommendations: getBasicRecommendations(user, nutritionSummary, calories)
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