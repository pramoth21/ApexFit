const WeightLog = require("../models/WeightLog");
const Meal = require("../models/Meal");
const Workout = require("../models/Workout");
const User = require("../models/User");

const roundNumber = (num) => {
    return Number(num.toFixed(2));
};

const getDateRange = (dateValue) => {
    const date = dateValue ? new Date(dateValue) : new Date();

    const start = new Date(date);
    start.setHours(0, 0, 0, 0);

    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    return { start, end };
};

const getRangeByDays = (days) => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const start = new Date();
    start.setDate(start.getDate() - Number(days) + 1);
    start.setHours(0, 0, 0, 0);

    return { start, end };
};

const formatDateKey = (date) => {
    return new Date(date).toISOString().split("T")[0];
};

const buildEmptyDailyMap = (start, end) => {
    const dayMap = {};

    const current = new Date(start);

    while (current <= end) {
        const key = formatDateKey(current);

        dayMap[key] = {
            date: key,
            caloriesConsumed: 0,
            caloriesBurned: 0,
            workoutDuration: 0,
            workoutsCompleted: 0
        };

        current.setDate(current.getDate() + 1);
    }

    return dayMap;
};

// @desc    Create weight log
// @route   POST /api/progress/weight
// @access  Private
const createWeightLog = async (req, res) => {
    try {
        const {
            weight,
            bodyFatPercentage,
            waist,
            chest,
            arms,
            thighs,
            unit,
            logDate,
            notes
        } = req.body || {};

        if (!weight) {
            return res.status(400).json({
                success: false,
                message: "Weight is required."
            });
        }

        const selectedDate = logDate ? new Date(logDate) : new Date();
        const { start, end } = getDateRange(selectedDate);

        const existingLog = await WeightLog.findOne({
            user: req.user._id,
            logDate: {
                $gte: start,
                $lte: end
            }
        });

        if (existingLog) {
            return res.status(400).json({
                success: false,
                message: "Weight log already exists for this date. Update the existing log instead."
            });
        }

        const weightLog = await WeightLog.create({
            user: req.user._id,
            weight,
            bodyFatPercentage,
            waist,
            chest,
            arms,
            thighs,
            unit: unit || "kg",
            logDate: selectedDate,
            notes
        });

        await User.findByIdAndUpdate(req.user._id, {
            weight
        });

        return res.status(201).json({
            success: true,
            message: "Weight log created successfully.",
            weightLog
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to create weight log.",
            error: error.message
        });
    }
};

// @desc    Get weight logs
// @route   GET /api/progress/weight?days=30
// @access  Private
const getWeightLogs = async (req, res) => {
    try {
        const { days, startDate, endDate } = req.query;

        const query = {
            user: req.user._id
        };

        if (days) {
            const range = getRangeByDays(days);
            query.logDate = {
                $gte: range.start,
                $lte: range.end
            };
        }

        if (startDate && endDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);

            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);

            query.logDate = {
                $gte: start,
                $lte: end
            };
        }

        const weightLogs = await WeightLog.find(query).sort({ logDate: 1 });

        return res.status(200).json({
            success: true,
            count: weightLogs.length,
            weightLogs
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch weight logs.",
            error: error.message
        });
    }
};

// @desc    Get single weight log
// @route   GET /api/progress/weight/:id
// @access  Private
const getWeightLogById = async (req, res) => {
    try {
        const weightLog = await WeightLog.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!weightLog) {
            return res.status(404).json({
                success: false,
                message: "Weight log not found."
            });
        }

        return res.status(200).json({
            success: true,
            weightLog
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch weight log.",
            error: error.message
        });
    }
};

// @desc    Update weight log
// @route   PUT /api/progress/weight/:id
// @access  Private
const updateWeightLog = async (req, res) => {
    try {
        const weightLog = await WeightLog.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!weightLog) {
            return res.status(404).json({
                success: false,
                message: "Weight log not found."
            });
        }

        const fields = [
            "weight",
            "bodyFatPercentage",
            "waist",
            "chest",
            "arms",
            "thighs",
            "unit",
            "logDate",
            "notes"
        ];

        fields.forEach((field) => {
            if (req.body[field] !== undefined) {
                weightLog[field] = req.body[field];
            }
        });

        const updatedLog = await weightLog.save();

        const latestLog = await WeightLog.findOne({
            user: req.user._id
        }).sort({ logDate: -1 });

        if (latestLog) {
            await User.findByIdAndUpdate(req.user._id, {
                weight: latestLog.weight
            });
        }

        return res.status(200).json({
            success: true,
            message: "Weight log updated successfully.",
            weightLog: updatedLog
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to update weight log.",
            error: error.message
        });
    }
};

// @desc    Delete weight log
// @route   DELETE /api/progress/weight/:id
// @access  Private
const deleteWeightLog = async (req, res) => {
    try {
        const weightLog = await WeightLog.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!weightLog) {
            return res.status(404).json({
                success: false,
                message: "Weight log not found."
            });
        }

        await weightLog.deleteOne();

        const latestLog = await WeightLog.findOne({
            user: req.user._id
        }).sort({ logDate: -1 });

        if (latestLog) {
            await User.findByIdAndUpdate(req.user._id, {
                weight: latestLog.weight
            });
        }

        return res.status(200).json({
            success: true,
            message: "Weight log deleted successfully."
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to delete weight log.",
            error: error.message
        });
    }
};

// @desc    Get progress chart data
// @route   GET /api/progress/charts?days=30
// @access  Private
const getProgressCharts = async (req, res) => {
    try {
        const days = Number(req.query.days) || 30;
        const { start, end } = getRangeByDays(days);

        const [weightLogs, meals, workouts] = await Promise.all([
            WeightLog.find({
                user: req.user._id,
                logDate: {
                    $gte: start,
                    $lte: end
                }
            }).sort({ logDate: 1 }),

            Meal.find({
                user: req.user._id,
                mealDate: {
                    $gte: start,
                    $lte: end
                }
            }).sort({ mealDate: 1 }),

            Workout.find({
                user: req.user._id,
                workoutDate: {
                    $gte: start,
                    $lte: end
                }
            }).sort({ workoutDate: 1 })
        ]);

        const dayMap = buildEmptyDailyMap(start, end);

        meals.forEach((meal) => {
            const key = formatDateKey(meal.mealDate);

            if (dayMap[key]) {
                dayMap[key].caloriesConsumed += meal.totalCalories;
            }
        });

        workouts.forEach((workout) => {
            const key = formatDateKey(workout.workoutDate);

            if (dayMap[key]) {
                dayMap[key].caloriesBurned += workout.caloriesBurned;
                dayMap[key].workoutDuration += workout.duration;
                dayMap[key].workoutsCompleted += 1;
            }
        });

        const calorieTrend = Object.values(dayMap).map((day) => ({
            date: day.date,
            caloriesConsumed: roundNumber(day.caloriesConsumed),
            caloriesBurned: roundNumber(day.caloriesBurned),
            netCalories: roundNumber(day.caloriesConsumed - day.caloriesBurned)
        }));

        const workoutTrend = Object.values(dayMap).map((day) => ({
            date: day.date,
            workoutDuration: day.workoutDuration,
            caloriesBurned: roundNumber(day.caloriesBurned),
            workoutsCompleted: day.workoutsCompleted
        }));

        const weightTrend = weightLogs.map((log) => ({
            date: formatDateKey(log.logDate),
            weight: log.weight,
            bodyFatPercentage: log.bodyFatPercentage,
            waist: log.waist
        }));

        return res.status(200).json({
            success: true,
            range: {
                days,
                startDate: formatDateKey(start),
                endDate: formatDateKey(end)
            },
            charts: {
                weightTrend,
                calorieTrend,
                workoutTrend
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch progress chart data.",
            error: error.message
        });
    }
};

// @desc    Get progress summary
// @route   GET /api/progress/summary?days=30
// @access  Private
const getProgressSummary = async (req, res) => {
    try {
        const days = Number(req.query.days) || 30;
        const { start, end } = getRangeByDays(days);

        const [weightLogs, meals, workouts] = await Promise.all([
            WeightLog.find({
                user: req.user._id,
                logDate: {
                    $gte: start,
                    $lte: end
                }
            }).sort({ logDate: 1 }),

            Meal.find({
                user: req.user._id,
                mealDate: {
                    $gte: start,
                    $lte: end
                }
            }),

            Workout.find({
                user: req.user._id,
                workoutDate: {
                    $gte: start,
                    $lte: end
                }
            })
        ]);

        const firstWeight = weightLogs.length > 0 ? weightLogs[0].weight : null;
        const latestWeight = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1].weight : null;
        const weightChange = firstWeight !== null && latestWeight !== null
            ? roundNumber(latestWeight - firstWeight)
            : null;

        const totalCaloriesConsumed = roundNumber(
            meals.reduce((sum, meal) => sum + meal.totalCalories, 0)
        );

        const totalCaloriesBurned = roundNumber(
            workouts.reduce((sum, workout) => sum + workout.caloriesBurned, 0)
        );

        const totalWorkoutDuration = workouts.reduce((sum, workout) => sum + workout.duration, 0);

        const averageCaloriesConsumed = meals.length > 0
            ? roundNumber(totalCaloriesConsumed / days)
            : 0;

        const averageCaloriesBurned = workouts.length > 0
            ? roundNumber(totalCaloriesBurned / days)
            : 0;

        const summary = {
            days,
            weight: {
                firstWeight,
                latestWeight,
                weightChange,
                totalLogs: weightLogs.length
            },
            nutrition: {
                mealsLogged: meals.length,
                totalCaloriesConsumed,
                averageCaloriesConsumed
            },
            workouts: {
                workoutsCompleted: workouts.length,
                totalWorkoutDuration,
                totalCaloriesBurned,
                averageCaloriesBurned
            },
            energyBalance: {
                totalCaloriesConsumed,
                totalCaloriesBurned,
                netCalories: roundNumber(totalCaloriesConsumed - totalCaloriesBurned)
            }
        };

        return res.status(200).json({
            success: true,
            summary
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch progress summary.",
            error: error.message
        });
    }
};

module.exports = {
    createWeightLog,
    getWeightLogs,
    getWeightLogById,
    updateWeightLog,
    deleteWeightLog,
    getProgressCharts,
    getProgressSummary
};