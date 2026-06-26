const Workout = require("../models/Workout");
const Exercise = require("../models/Exercise");
const User = require("../models/User");
const axios = require("axios");

// -----------------------------
// Helper: Intensity multiplier
// -----------------------------
const getIntensityMultiplier = (intensity) => {
    if (intensity === "Low") return 0.85;
    if (intensity === "High") return 1.2;
    return 1;
};

// -----------------------------
// Helper: Formula calorie calculation
// Used when Flask AI service fails/off
// -----------------------------
const calculateFormulaCalories = (exercise, duration, intensity) => {
    const multiplier = getIntensityMultiplier(intensity || "Medium");

    const calories = exercise.caloriesBurnedPerMinute * Number(duration) * multiplier;

    return Number(calories.toFixed(2));
};

// -----------------------------
// Helper: Call Flask AI API
// -----------------------------
const predictCaloriesWithAI = async ({
    user,
    exercise,
    duration,
    intensity,
    distance
}) => {
    try {
        const aiServiceUrl = process.env.AI_SERVICE_URL || "http://localhost:5001";

        const response = await axios.post(
            `${aiServiceUrl}/predict-calories`,
            {
                gender: user.gender,
                age: user.age,
                height: user.height,
                weight: user.weight,
                exerciseType: exercise.name,
                duration: Number(duration),
                intensity: intensity || "Medium",
                distance: Number(distance || 0)
            },
            {
                timeout: 5000
            }
        );

        if (
            response.data &&
            response.data.success === true &&
            response.data.prediction &&
            response.data.prediction.caloriesBurned !== undefined
        ) {
            return {
                success: true,
                caloriesBurned: Number(response.data.prediction.caloriesBurned),
                source: "ML Model"
            };
        }

        return {
            success: false
        };

    } catch (error) {
        console.log("AI calorie prediction failed. Using formula fallback.");
        console.log(error.message);

        return {
            success: false
        };
    }
};

// -----------------------------
// Create Workout
// POST /api/workouts
// -----------------------------
exports.createWorkout = async (req, res) => {
    try {
        const {
            exerciseId,
            duration,
            caloriesBurned,
            intensity,
            sets,
            reps,
            weightUsed,
            distance,
            distanceUnit,
            workoutDate,
            notes
        } = req.body || {};

        if (!exerciseId || !duration) {
            return res.status(400).json({
                success: false,
                message: "Exercise ID and duration are required."
            });
        }

        const exercise = await Exercise.findById(exerciseId);

        if (!exercise || exercise.isActive === false) {
            return res.status(404).json({
                success: false,
                message: "Exercise not found."
            });
        }

        const user = await User.findById(req.user._id).select("-password");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        const finalIntensity = intensity || "Medium";

        let finalCaloriesBurned;
        let caloriePredictionSource;

        // If user manually gives calories, use that
        if (
            caloriesBurned !== undefined &&
            caloriesBurned !== null &&
            caloriesBurned !== ""
        ) {
            finalCaloriesBurned = Number(caloriesBurned);
            caloriePredictionSource = "Manual";
        } else {
            // Try Flask ML prediction first
            const aiPrediction = await predictCaloriesWithAI({
                user,
                exercise,
                duration,
                intensity: finalIntensity,
                distance
            });

            if (aiPrediction.success) {
                finalCaloriesBurned = aiPrediction.caloriesBurned;
                caloriePredictionSource = "ML Model";
            } else {
                // Fallback formula if Flask AI is off/error
                finalCaloriesBurned = calculateFormulaCalories(
                    exercise,
                    Number(duration),
                    finalIntensity
                );
                caloriePredictionSource = "Formula";
            }
        }

        const workout = await Workout.create({
            user: req.user._id,
            exercise: exercise._id,
            exerciseName: exercise.name,
            category: exercise.category,

            duration: Number(duration),
            caloriesBurned: Number(finalCaloriesBurned.toFixed(2)),
            caloriePredictionSource,

            intensity: finalIntensity,

            sets: Number(sets || 0),
            reps: Number(reps || 0),
            weightUsed: Number(weightUsed || 0),

            distance: Number(distance || 0),
            distanceUnit: distanceUnit || "none",

            workoutDate: workoutDate ? new Date(workoutDate) : new Date(),
            notes: notes || ""
        });

        return res.status(201).json({
            success: true,
            message: "Workout logged successfully.",
            workout
        });

    } catch (error) {
        console.error("Create workout error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error while creating workout.",
            error: error.message
        });
    }
};

// -----------------------------
// Get User Workouts
// GET /api/workouts
// Query: date, category, intensity, startDate, endDate
// -----------------------------
exports.getUserWorkouts = async (req, res) => {
    try {
        const { date, category, intensity, startDate, endDate } = req.query;

        const filter = {
            user: req.user._id
        };

        if (category) {
            filter.category = category;
        }

        if (intensity) {
            filter.intensity = intensity;
        }

        if (date) {
            const selectedDate = new Date(date);
            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);

            filter.workoutDate = {
                $gte: selectedDate,
                $lt: nextDate
            };
        }

        if (startDate && endDate) {
            filter.workoutDate = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const workouts = await Workout.find(filter)
            .populate("exercise", "name category targetMuscle difficulty")
            .sort({ workoutDate: -1, createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: workouts.length,
            workouts
        });

    } catch (error) {
        console.error("Get workouts error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error while fetching workouts.",
            error: error.message
        });
    }
};

// -----------------------------
// Get Single Workout
// GET /api/workouts/:id
// -----------------------------
exports.getWorkoutById = async (req, res) => {
    try {
        const workout = await Workout.findOne({
            _id: req.params.id,
            user: req.user._id
        }).populate("exercise", "name category targetMuscle difficulty instructions");

        if (!workout) {
            return res.status(404).json({
                success: false,
                message: "Workout not found."
            });
        }

        return res.status(200).json({
            success: true,
            workout
        });

    } catch (error) {
        console.error("Get workout by id error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error while fetching workout.",
            error: error.message
        });
    }
};

// -----------------------------
// Update Workout
// PUT /api/workouts/:id
// -----------------------------
exports.updateWorkout = async (req, res) => {
    try {
        const workout = await Workout.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!workout) {
            return res.status(404).json({
                success: false,
                message: "Workout not found."
            });
        }

        const {
            duration,
            caloriesBurned,
            intensity,
            sets,
            reps,
            weightUsed,
            distance,
            distanceUnit,
            workoutDate,
            notes
        } = req.body || {};

        if (duration !== undefined) workout.duration = Number(duration);
        if (intensity !== undefined) workout.intensity = intensity;
        if (sets !== undefined) workout.sets = Number(sets);
        if (reps !== undefined) workout.reps = Number(reps);
        if (weightUsed !== undefined) workout.weightUsed = Number(weightUsed);
        if (distance !== undefined) workout.distance = Number(distance);
        if (distanceUnit !== undefined) workout.distanceUnit = distanceUnit;
        if (workoutDate !== undefined) workout.workoutDate = new Date(workoutDate);
        if (notes !== undefined) workout.notes = notes;

        // If manual calories are provided
        if (
            caloriesBurned !== undefined &&
            caloriesBurned !== null &&
            caloriesBurned !== ""
        ) {
            workout.caloriesBurned = Number(caloriesBurned);
            workout.caloriePredictionSource = "Manual";
        } else if (
            duration !== undefined ||
            intensity !== undefined ||
            distance !== undefined
        ) {
            // Recalculate only when workout calculation fields changed
            const user = await User.findById(req.user._id).select("-password");
            const exercise = await Exercise.findById(workout.exercise);

            if (!user || !exercise) {
                return res.status(404).json({
                    success: false,
                    message: "User or exercise not found."
                });
            }

            const aiPrediction = await predictCaloriesWithAI({
                user,
                exercise,
                duration: workout.duration,
                intensity: workout.intensity,
                distance: workout.distance
            });

            if (aiPrediction.success) {
                workout.caloriesBurned = Number(aiPrediction.caloriesBurned.toFixed(2));
                workout.caloriePredictionSource = "ML Model";
            } else {
                workout.caloriesBurned = calculateFormulaCalories(
                    exercise,
                    workout.duration,
                    workout.intensity
                );
                workout.caloriePredictionSource = "Formula";
            }
        }

        await workout.save();

        return res.status(200).json({
            success: true,
            message: "Workout updated successfully.",
            workout
        });

    } catch (error) {
        console.error("Update workout error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error while updating workout.",
            error: error.message
        });
    }
};

// -----------------------------
// Delete Workout
// DELETE /api/workouts/:id
// -----------------------------
exports.deleteWorkout = async (req, res) => {
    try {
        const workout = await Workout.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!workout) {
            return res.status(404).json({
                success: false,
                message: "Workout not found."
            });
        }

        await workout.deleteOne();

        return res.status(200).json({
            success: true,
            message: "Workout deleted successfully."
        });

    } catch (error) {
        console.error("Delete workout error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error while deleting workout.",
            error: error.message
        });
    }
};

// -----------------------------
// Daily Workout Summary
// GET /api/workouts/summary/daily?date=YYYY-MM-DD
// -----------------------------
exports.getDailyWorkoutSummary = async (req, res) => {
    try {
        const { date } = req.query;

        const selectedDate = date ? new Date(date) : new Date();

        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);

        const workouts = await Workout.find({
            user: req.user._id,
            workoutDate: {
                $gte: startOfDay,
                $lte: endOfDay
            }
        }).sort({ workoutDate: -1 });

        const summary = {
            date: startOfDay,
            workoutsCompleted: workouts.length,
            totalDuration: 0,
            totalCaloriesBurned: 0,

            cardioMinutes: 0,
            strengthMinutes: 0,
            flexibilityMinutes: 0,
            balanceMinutes: 0,
            sportsMinutes: 0,
            otherMinutes: 0,

            mlPredictedWorkouts: 0,
            formulaPredictedWorkouts: 0,
            manualWorkouts: 0
        };

        workouts.forEach((workout) => {
            summary.totalDuration += workout.duration || 0;
            summary.totalCaloriesBurned += workout.caloriesBurned || 0;

            if (workout.category === "Cardio") {
                summary.cardioMinutes += workout.duration || 0;
            } else if (workout.category === "Strength") {
                summary.strengthMinutes += workout.duration || 0;
            } else if (workout.category === "Flexibility") {
                summary.flexibilityMinutes += workout.duration || 0;
            } else if (workout.category === "Balance") {
                summary.balanceMinutes += workout.duration || 0;
            } else if (workout.category === "Sports") {
                summary.sportsMinutes += workout.duration || 0;
            } else {
                summary.otherMinutes += workout.duration || 0;
            }

            if (workout.caloriePredictionSource === "ML Model") {
                summary.mlPredictedWorkouts += 1;
            } else if (workout.caloriePredictionSource === "Manual") {
                summary.manualWorkouts += 1;
            } else {
                summary.formulaPredictedWorkouts += 1;
            }
        });

        summary.totalCaloriesBurned = Number(summary.totalCaloriesBurned.toFixed(2));

        return res.status(200).json({
            success: true,
            summary,
            workouts
        });

    } catch (error) {
        console.error("Daily workout summary error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error while fetching daily workout summary.",
            error: error.message
        });
    }
};

// -----------------------------
// Weekly Workout Summary
// GET /api/workouts/summary/weekly
// -----------------------------
exports.getWeeklyWorkoutSummary = async (req, res) => {
    try {
        const today = new Date();

        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - 6);
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfToday = new Date(today);
        endOfToday.setHours(23, 59, 59, 999);

        const workouts = await Workout.find({
            user: req.user._id,
            workoutDate: {
                $gte: startOfWeek,
                $lte: endOfToday
            }
        }).sort({ workoutDate: 1 });

        const dailyMap = {};

        for (let i = 0; i < 7; i++) {
            const day = new Date(startOfWeek);
            day.setDate(startOfWeek.getDate() + i);

            const key = day.toISOString().split("T")[0];

            dailyMap[key] = {
                date: key,
                workoutsCompleted: 0,
                totalDuration: 0,
                totalCaloriesBurned: 0
            };
        }

        workouts.forEach((workout) => {
            const key = workout.workoutDate.toISOString().split("T")[0];

            if (dailyMap[key]) {
                dailyMap[key].workoutsCompleted += 1;
                dailyMap[key].totalDuration += workout.duration || 0;
                dailyMap[key].totalCaloriesBurned += workout.caloriesBurned || 0;
            }
        });

        const weeklyData = Object.values(dailyMap).map((day) => ({
            ...day,
            totalCaloriesBurned: Number(day.totalCaloriesBurned.toFixed(2))
        }));

        const summary = {
            totalWorkouts: workouts.length,
            totalDuration: workouts.reduce((sum, w) => sum + (w.duration || 0), 0),
            totalCaloriesBurned: Number(
                workouts.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0).toFixed(2)
            ),
            dailyData: weeklyData
        };

        return res.status(200).json({
            success: true,
            summary
        });

    } catch (error) {
        console.error("Weekly workout summary error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error while fetching weekly workout summary.",
            error: error.message
        });
    }
};