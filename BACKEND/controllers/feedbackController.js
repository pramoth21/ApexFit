const Meal = require("../models/Meal");
const Workout = require("../models/Workout");

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

// Same rule used in your dashboard's recommendedCalories, kept identical
// on purpose so the feedback engine agrees with what the dashboard shows.
const getTargetCalories = (user) => {
    const bmr = calculateBMR(user);
    if (!bmr) return null;

    const maintenanceCalories = Math.round(bmr * getActivityMultiplier(user.activityLevel));

    let targetCalories = maintenanceCalories;
    if (user.goal === "Weight Loss") targetCalories = maintenanceCalories - 400;
    if (user.goal === "Weight Gain") targetCalories = maintenanceCalories + 400;
    if (user.goal === "Muscle Gain") targetCalories = maintenanceCalories + 250;
    if (user.goal === "Maintenance") targetCalories = maintenanceCalories;

    return { maintenanceCalories, targetCalories };
};

const getTodayRange = () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start, end };
};

const getLastNDaysRange = (days) => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const start = new Date();
    start.setDate(start.getDate() - Number(days) + 1);
    start.setHours(0, 0, 0, 0);

    return { start, end };
};

const getTodayCaloriesConsumed = async (userId) => {
    const { start, end } = getTodayRange();

    const meals = await Meal.find({
        user: userId,
        mealDate: { $gte: start, $lte: end }
    });

    return {
        mealsLogged: meals.length,
        totalCalories: meals.reduce((sum, meal) => sum + meal.totalCalories, 0)
    };
};

const getWorkoutCountInLastDays = async (userId, days) => {
    const { start, end } = getLastNDaysRange(days);

    const count = await Workout.countDocuments({
        user: userId,
        workoutDate: { $gte: start, $lte: end }
    });

    return count;
};

// @desc    Get rule-based smart feedback alerts for the logged-in user
// @route   GET /api/feedback
// @access  Private
const getSmartFeedback = async (req, res) => {
    try {
        const user = req.user;
        const alerts = [];

        if (!user.age || !user.gender || !user.weight || !user.height) {
            return res.status(400).json({
                success: false,
                message: "Complete your profile (age, gender, weight, height) to get smart feedback."
            });
        }

        const calorieTargets = getTargetCalories(user);
        const { mealsLogged, totalCalories } = await getTodayCaloriesConsumed(user._id);
        const workoutsLast3Days = await getWorkoutCountInLastDays(user._id, 3);

        // ---- Rule 1: Overeating ----
        if (calorieTargets && totalCalories > calorieTargets.targetCalories) {
            const excess = Math.round(totalCalories - calorieTargets.targetCalories);
            alerts.push({
                type: "Overeating",
                severity: "warning",
                title: "Calorie intake is over target",
                message: `You've consumed ${totalCalories} kcal today, which is ${excess} kcal above your target of ${calorieTargets.targetCalories} kcal.`
            });
        }

        // ---- Rule 2: Under-eating ----
        // Only warn if they've actually logged something low, not just an empty day
        if (
            calorieTargets &&
            mealsLogged > 0 &&
            totalCalories < calorieTargets.targetCalories * 0.7
        ) {
            alerts.push({
                type: "Undereating",
                severity: "warning",
                title: "Calorie intake is well below target",
                message: `You've only consumed ${totalCalories} kcal today, well below your ${calorieTargets.targetCalories} kcal target. Consider adding a balanced meal.`
            });
        }

        // ---- Rule 3: No meals logged today ----
        if (mealsLogged === 0) {
            alerts.push({
                type: "NoMealsLogged",
                severity: "info",
                title: "No meals logged today",
                message: "You haven't logged any meals today. Log your meals to track your progress accurately."
            });
        }

        // ---- Rule 4: Inactivity (no workout in the last 3 days) ----
        if (workoutsLast3Days === 0) {
            alerts.push({
                type: "Inactive",
                severity: "warning",
                title: "No workouts in the last 3 days",
                message: "You haven't logged a workout in 3 days. Even a short walk or light session helps keep you on track."
            });
        }

        // ---- If nothing triggered, everything is on track ----
        if (alerts.length === 0) {
            alerts.push({
                type: "OnTrack",
                severity: "success",
                title: "You're on track",
                message: "Your calorie intake and activity levels look good today. Keep it up."
            });
        }

        return res.status(200).json({
            success: true,
            generatedAt: new Date(),
            basedOn: {
                targetCalories: calorieTargets ? calorieTargets.targetCalories : null,
                todayCaloriesConsumed: totalCalories,
                mealsLoggedToday: mealsLogged,
                workoutsInLast3Days: workoutsLast3Days
            },
            alerts
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to generate smart feedback.",
            error: error.message
        });
    }
};

module.exports = {
    getSmartFeedback
};