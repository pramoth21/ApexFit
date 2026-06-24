const Exercise = require("../models/Exercise");
const Workout = require("../models/Workout");

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

const getWeekRange = (dateValue) => {
    const date = dateValue ? new Date(dateValue) : new Date();

    const day = date.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;

    const start = new Date(date);
    start.setDate(date.getDate() + diffToMonday);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return { start, end };
};

const getIntensityMultiplier = (intensity) => {
    const multipliers = {
        Low: 0.85,
        Medium: 1,
        High: 1.2
    };

    return multipliers[intensity] || 1;
};

const calculateCaloriesBurned = (exercise, duration, intensity) => {
    const multiplier = getIntensityMultiplier(intensity);
    return roundNumber(exercise.caloriesBurnedPerMinute * duration * multiplier);
};

// @desc    Log workout
// @route   POST /api/workouts
// @access  Private
const createWorkout = async (req, res) => {
    try {
        const {
            exerciseId,
            duration,
            intensity,
            caloriesBurned,
            sets,
            reps,
            weightUsed,
            distance,
            distanceUnit,
            workoutDate,
            notes
        } = req.body || {};

        if (!exerciseId) {
            return res.status(400).json({
                success: false,
                message: "Exercise ID is required."
            });
        }

        if (!duration || Number(duration) <= 0) {
            return res.status(400).json({
                success: false,
                message: "Workout duration must be greater than 0."
            });
        }

        const exercise = await Exercise.findById(exerciseId);

        if (!exercise || !exercise.isActive) {
            return res.status(404).json({
                success: false,
                message: "Exercise not found or inactive."
            });
        }

        const finalIntensity = intensity || "Medium";

        const calculatedCalories = caloriesBurned !== undefined && caloriesBurned !== null
            ? Number(caloriesBurned)
            : calculateCaloriesBurned(exercise, Number(duration), finalIntensity);

        const workout = await Workout.create({
            user: req.user._id,
            exercise: exercise._id,
            exerciseName: exercise.name,
            category: exercise.category,
            duration: Number(duration),
            caloriesBurned: roundNumber(calculatedCalories),
            intensity: finalIntensity,
            sets: sets || 0,
            reps: reps || 0,
            weightUsed: weightUsed || 0,
            distance: distance || 0,
            distanceUnit: distanceUnit || "none",
            workoutDate: workoutDate ? new Date(workoutDate) : new Date(),
            notes
        });

        const populatedWorkout = await Workout.findById(workout._id).populate(
            "exercise",
            "name category targetMuscle difficulty caloriesBurnedPerMinute"
        );

        return res.status(201).json({
            success: true,
            message: "Workout logged successfully.",
            workout: populatedWorkout
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to log workout.",
            error: error.message
        });
    }
};

// @desc    Get user workouts
// @route   GET /api/workouts
// @access  Private
const getUserWorkouts = async (req, res) => {
    try {
        const { date, category, intensity, startDate, endDate } = req.query;

        const query = {
            user: req.user._id
        };

        if (date) {
            const { start, end } = getDateRange(date);
            query.workoutDate = { $gte: start, $lte: end };
        }

        if (startDate && endDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);

            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);

            query.workoutDate = { $gte: start, $lte: end };
        }

        if (category) {
            query.category = category;
        }

        if (intensity) {
            query.intensity = intensity;
        }

        const workouts = await Workout.find(query)
            .populate("exercise", "name category targetMuscle difficulty caloriesBurnedPerMinute")
            .sort({ workoutDate: -1 });

        return res.status(200).json({
            success: true,
            count: workouts.length,
            workouts
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch workouts.",
            error: error.message
        });
    }
};

// @desc    Get single workout
// @route   GET /api/workouts/:id
// @access  Private
const getWorkoutById = async (req, res) => {
    try {
        const workout = await Workout.findOne({
            _id: req.params.id,
            user: req.user._id
        }).populate("exercise", "name category targetMuscle difficulty caloriesBurnedPerMinute");

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
        return res.status(500).json({
            success: false,
            message: "Failed to fetch workout.",
            error: error.message
        });
    }
};

// @desc    Update workout
// @route   PUT /api/workouts/:id
// @access  Private
const updateWorkout = async (req, res) => {
    try {
        const {
            exerciseId,
            duration,
            intensity,
            caloriesBurned,
            sets,
            reps,
            weightUsed,
            distance,
            distanceUnit,
            workoutDate,
            notes
        } = req.body || {};

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

        let exercise = null;

        if (exerciseId) {
            exercise = await Exercise.findById(exerciseId);

            if (!exercise || !exercise.isActive) {
                return res.status(404).json({
                    success: false,
                    message: "Exercise not found or inactive."
                });
            }

            workout.exercise = exercise._id;
            workout.exerciseName = exercise.name;
            workout.category = exercise.category;
        } else {
            exercise = await Exercise.findById(workout.exercise);
        }

        if (duration !== undefined) workout.duration = Number(duration);
        if (intensity !== undefined) workout.intensity = intensity;
        if (sets !== undefined) workout.sets = sets;
        if (reps !== undefined) workout.reps = reps;
        if (weightUsed !== undefined) workout.weightUsed = weightUsed;
        if (distance !== undefined) workout.distance = distance;
        if (distanceUnit !== undefined) workout.distanceUnit = distanceUnit;
        if (workoutDate !== undefined) workout.workoutDate = new Date(workoutDate);
        if (notes !== undefined) workout.notes = notes;

        if (caloriesBurned !== undefined && caloriesBurned !== null) {
            workout.caloriesBurned = roundNumber(Number(caloriesBurned));
        } else if (exercise) {
            workout.caloriesBurned = calculateCaloriesBurned(
                exercise,
                Number(workout.duration),
                workout.intensity
            );
        }

        const updatedWorkout = await workout.save();

        const populatedWorkout = await Workout.findById(updatedWorkout._id).populate(
            "exercise",
            "name category targetMuscle difficulty caloriesBurnedPerMinute"
        );

        return res.status(200).json({
            success: true,
            message: "Workout updated successfully.",
            workout: populatedWorkout
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to update workout.",
            error: error.message
        });
    }
};

// @desc    Delete workout
// @route   DELETE /api/workouts/:id
// @access  Private
const deleteWorkout = async (req, res) => {
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
        return res.status(500).json({
            success: false,
            message: "Failed to delete workout.",
            error: error.message
        });
    }
};

// @desc    Get daily workout summary
// @route   GET /api/workouts/summary/daily?date=2026-06-24
// @access  Private
const getDailyWorkoutSummary = async (req, res) => {
    try {
        const { date } = req.query;
        const { start, end } = getDateRange(date);

        const workouts = await Workout.find({
            user: req.user._id,
            workoutDate: {
                $gte: start,
                $lte: end
            }
        }).sort({ workoutDate: 1 });

        const summary = {
            date: start.toISOString().split("T")[0],
            totalWorkouts: workouts.length,
            totalDuration: 0,
            totalCaloriesBurned: 0,
            cardioMinutes: 0,
            strengthMinutes: 0,
            flexibilityMinutes: 0,
            balanceMinutes: 0,
            sportsMinutes: 0,
            otherMinutes: 0
        };

        workouts.forEach((workout) => {
            summary.totalDuration += workout.duration;
            summary.totalCaloriesBurned += workout.caloriesBurned;

            if (workout.category === "Cardio") summary.cardioMinutes += workout.duration;
            else if (workout.category === "Strength") summary.strengthMinutes += workout.duration;
            else if (workout.category === "Flexibility") summary.flexibilityMinutes += workout.duration;
            else if (workout.category === "Balance") summary.balanceMinutes += workout.duration;
            else if (workout.category === "Sports") summary.sportsMinutes += workout.duration;
            else summary.otherMinutes += workout.duration;
        });

        summary.totalCaloriesBurned = roundNumber(summary.totalCaloriesBurned);

        return res.status(200).json({
            success: true,
            summary,
            workouts
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch daily workout summary.",
            error: error.message
        });
    }
};

// @desc    Get weekly workout summary
// @route   GET /api/workouts/summary/weekly?date=2026-06-24
// @access  Private
const getWeeklyWorkoutSummary = async (req, res) => {
    try {
        const { date } = req.query;
        const { start, end } = getWeekRange(date);

        const workouts = await Workout.find({
            user: req.user._id,
            workoutDate: {
                $gte: start,
                $lte: end
            }
        }).sort({ workoutDate: 1 });

        const summary = {
            weekStart: start.toISOString().split("T")[0],
            weekEnd: end.toISOString().split("T")[0],
            totalWorkouts: workouts.length,
            totalDuration: 0,
            totalCaloriesBurned: 0,
            averageDuration: 0,
            averageCaloriesBurned: 0
        };

        const dayMap = {};

        for (let i = 0; i < 7; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            const key = d.toISOString().split("T")[0];

            dayMap[key] = {
                date: key,
                workouts: 0,
                duration: 0,
                caloriesBurned: 0
            };
        }

        workouts.forEach((workout) => {
            summary.totalDuration += workout.duration;
            summary.totalCaloriesBurned += workout.caloriesBurned;

            const key = workout.workoutDate.toISOString().split("T")[0];

            if (dayMap[key]) {
                dayMap[key].workouts += 1;
                dayMap[key].duration += workout.duration;
                dayMap[key].caloriesBurned += workout.caloriesBurned;
            }
        });

        summary.totalCaloriesBurned = roundNumber(summary.totalCaloriesBurned);

        if (summary.totalWorkouts > 0) {
            summary.averageDuration = roundNumber(summary.totalDuration / summary.totalWorkouts);
            summary.averageCaloriesBurned = roundNumber(summary.totalCaloriesBurned / summary.totalWorkouts);
        }

        const dailyBreakdown = Object.values(dayMap).map((day) => ({
            ...day,
            caloriesBurned: roundNumber(day.caloriesBurned)
        }));

        return res.status(200).json({
            success: true,
            summary,
            dailyBreakdown,
            workouts
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch weekly workout summary.",
            error: error.message
        });
    }
};

module.exports = {
    createWorkout,
    getUserWorkouts,
    getWorkoutById,
    updateWorkout,
    deleteWorkout,
    getDailyWorkoutSummary,
    getWeeklyWorkoutSummary
};