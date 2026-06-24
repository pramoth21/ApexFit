const Meal = require("../models/Meal");
const Workout = require("../models/Workout");
const WeightLog = require("../models/WeightLog");

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
        source: "Rule-Based Formula - temporary until Flask ML model is connected",
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

const getTodayDateRange = () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    return { start, end };
};

const getLastDaysRange = (days) => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const start = new Date();
    start.setDate(start.getDate() - Number(days) + 1);
    start.setHours(0, 0, 0, 0);

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

        if (meal.mealType === "Breakfast") summary.breakfastCalories += meal.totalCalories;
        if (meal.mealType === "Lunch") summary.lunchCalories += meal.totalCalories;
        if (meal.mealType === "Dinner") summary.dinnerCalories += meal.totalCalories;
        if (meal.mealType === "Snack") summary.snackCalories += meal.totalCalories;
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

const getTodayWorkoutSummary = async (userId) => {
    const { start, end } = getTodayDateRange();

    const workouts = await Workout.find({
        user: userId,
        workoutDate: {
            $gte: start,
            $lte: end
        }
    }).sort({ workoutDate: 1 });

    const summary = {
        workoutsCompleted: workouts.length,
        totalWorkoutDuration: 0,
        totalCaloriesBurned: 0,
        cardioMinutes: 0,
        strengthMinutes: 0,
        flexibilityMinutes: 0,
        otherMinutes: 0
    };

    workouts.forEach((workout) => {
        summary.totalWorkoutDuration += workout.duration;
        summary.totalCaloriesBurned += workout.caloriesBurned;

        if (workout.category === "Cardio") summary.cardioMinutes += workout.duration;
        else if (workout.category === "Strength") summary.strengthMinutes += workout.duration;
        else if (workout.category === "Flexibility") summary.flexibilityMinutes += workout.duration;
        else summary.otherMinutes += workout.duration;
    });

    return {
        workoutsCompleted: summary.workoutsCompleted,
        totalWorkoutDuration: summary.totalWorkoutDuration,
        totalCaloriesBurned: roundNumber(summary.totalCaloriesBurned),
        cardioMinutes: summary.cardioMinutes,
        strengthMinutes: summary.strengthMinutes,
        flexibilityMinutes: summary.flexibilityMinutes,
        otherMinutes: summary.otherMinutes,
        workouts
    };
};

const getProgressSummary = async (userId) => {
    const { start, end } = getLastDaysRange(30);

    const logs = await WeightLog.find({
        user: userId,
        logDate: {
            $gte: start,
            $lte: end
        }
    }).sort({ logDate: 1 });

    const latestLog = await WeightLog.findOne({
        user: userId
    }).sort({ logDate: -1 });

    const firstWeight = logs.length > 0 ? logs[0].weight : null;
    const latestWeight = latestLog ? latestLog.weight : null;

    const weightChange30Days = firstWeight !== null && latestWeight !== null
        ? roundNumber(latestWeight - firstWeight)
        : null;

    return {
        latestWeight,
        firstWeightInRange: firstWeight,
        weightChange30Days,
        totalWeightLogs: logs.length,
        latestLogDate: latestLog ? latestLog.logDate : null
    };
};

const getBasicRecommendations = (user, nutritionSummary, workoutSummary, progressSummary, calories) => {
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

    if (workoutSummary.workoutsCompleted === 0) {
        recommendations.push("No workout logged today. Add at least a short walk or strength session.");
    }

    if (user.goal === "Weight Loss" && workoutSummary.cardioMinutes < 20) {
        recommendations.push("For weight loss, try adding at least 20 minutes of cardio.");
    }

    if (user.goal === "Muscle Gain" && workoutSummary.strengthMinutes < 20) {
        recommendations.push("For muscle gain, include strength training and progressive overload.");
    }

    if (progressSummary.totalWeightLogs === 0) {
        recommendations.push("Add your first weight log to track your progress trend.");
    }

    if (user.goal === "Weight Loss" && progressSummary.weightChange30Days !== null && progressSummary.weightChange30Days > 0) {
        recommendations.push("Your weight increased in the last 30 days. Review calorie intake and activity level.");
    }

    if (user.goal === "Muscle Gain" && progressSummary.weightChange30Days !== null && progressSummary.weightChange30Days < 0) {
        recommendations.push("Your weight decreased in the last 30 days. Increase calories and protein for muscle gain.");
    }

    if (recommendations.length === 0) {
        recommendations.push("Good progress. Keep logging meals, workouts, and weight consistently.");
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

        const nutritionSummary = await getTodayNutritionSummary(user._id);
        const workoutSummary = await getTodayWorkoutSummary(user._id);
        const progressSummary = await getProgressSummary(user._id);

        const recommendedCalories = calories ? calories.recommendedCalories : 0;
        const caloriesRemaining = recommendedCalories - nutritionSummary.totalCalories;
        const netCalories = nutritionSummary.totalCalories - workoutSummary.totalCaloriesBurned;

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
                    source: "Not available",
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

                workoutCards: {
                    workoutsCompleted: workoutSummary.workoutsCompleted,
                    totalWorkoutDuration: workoutSummary.totalWorkoutDuration,
                    caloriesBurned: workoutSummary.totalCaloriesBurned,
                    cardioMinutes: workoutSummary.cardioMinutes,
                    strengthMinutes: workoutSummary.strengthMinutes,
                    flexibilityMinutes: workoutSummary.flexibilityMinutes,
                    otherMinutes: workoutSummary.otherMinutes
                },

                progressCards: {
                    latestWeight: progressSummary.latestWeight,
                    firstWeightInRange: progressSummary.firstWeightInRange,
                    weightChange30Days: progressSummary.weightChange30Days,
                    totalWeightLogs: progressSummary.totalWeightLogs,
                    latestLogDate: progressSummary.latestLogDate
                },

                energyBalance: {
                    caloriesConsumed: nutritionSummary.totalCalories,
                    caloriesBurnedFromWorkout: workoutSummary.totalCaloriesBurned,
                    netCalories,
                    calorieTarget: recommendedCalories
                },

                mealBreakdown: {
                    breakfastCalories: nutritionSummary.breakfastCalories,
                    lunchCalories: nutritionSummary.lunchCalories,
                    dinnerCalories: nutritionSummary.dinnerCalories,
                    snackCalories: nutritionSummary.snackCalories
                },

                todayMeals: nutritionSummary.meals,
                todayWorkouts: workoutSummary.workouts,

                recommendations: getBasicRecommendations(
                    user,
                    nutritionSummary,
                    workoutSummary,
                    progressSummary,
                    calories
                )
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