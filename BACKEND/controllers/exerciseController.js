const Exercise = require("../models/Exercise");

// @desc    Create exercise
// @route   POST /api/exercises
// @access  Private
const createExercise = async (req, res) => {
    try {
        const {
            name,
            category,
            targetMuscle,
            difficulty,
            caloriesBurnedPerMinute,
            instructions,
            equipment
        } = req.body || {};

        if (!name || caloriesBurnedPerMinute === undefined) {
            return res.status(400).json({
                success: false,
                message: "Exercise name and calories burned per minute are required."
            });
        }

        const existingExercise = await Exercise.findOne({
            name: { $regex: new RegExp(`^${name}$`, "i") }
        });

        if (existingExercise) {
            return res.status(400).json({
                success: false,
                message: "Exercise already exists."
            });
        }

        const exercise = await Exercise.create({
            name,
            category,
            targetMuscle,
            difficulty,
            caloriesBurnedPerMinute,
            instructions,
            equipment,
            createdBy: req.user._id
        });

        return res.status(201).json({
            success: true,
            message: "Exercise created successfully.",
            exercise
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to create exercise.",
            error: error.message
        });
    }
};

// @desc    Get all exercises
// @route   GET /api/exercises
// @access  Private
const getExercises = async (req, res) => {
    try {
        const { search, category, difficulty } = req.query;

        const query = { isActive: true };

        if (search) {
            query.name = { $regex: search, $options: "i" };
        }

        if (category) {
            query.category = category;
        }

        if (difficulty) {
            query.difficulty = difficulty;
        }

        const exercises = await Exercise.find(query).sort({ name: 1 });

        return res.status(200).json({
            success: true,
            count: exercises.length,
            exercises
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch exercises.",
            error: error.message
        });
    }
};

// @desc    Get single exercise
// @route   GET /api/exercises/:id
// @access  Private
const getExerciseById = async (req, res) => {
    try {
        const exercise = await Exercise.findById(req.params.id);

        if (!exercise) {
            return res.status(404).json({
                success: false,
                message: "Exercise not found."
            });
        }

        return res.status(200).json({
            success: true,
            exercise
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch exercise.",
            error: error.message
        });
    }
};

// @desc    Update exercise
// @route   PUT /api/exercises/:id
// @access  Private
const updateExercise = async (req, res) => {
    try {
        const exercise = await Exercise.findById(req.params.id);

        if (!exercise) {
            return res.status(404).json({
                success: false,
                message: "Exercise not found."
            });
        }

        const fields = [
            "name",
            "category",
            "targetMuscle",
            "difficulty",
            "caloriesBurnedPerMinute",
            "instructions",
            "equipment",
            "isActive"
        ];

        fields.forEach((field) => {
            if (req.body[field] !== undefined) {
                exercise[field] = req.body[field];
            }
        });

        const updatedExercise = await exercise.save();

        return res.status(200).json({
            success: true,
            message: "Exercise updated successfully.",
            exercise: updatedExercise
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to update exercise.",
            error: error.message
        });
    }
};

// @desc    Delete/deactivate exercise
// @route   DELETE /api/exercises/:id
// @access  Private
const deleteExercise = async (req, res) => {
    try {
        const exercise = await Exercise.findById(req.params.id);

        if (!exercise) {
            return res.status(404).json({
                success: false,
                message: "Exercise not found."
            });
        }

        exercise.isActive = false;
        await exercise.save();

        return res.status(200).json({
            success: true,
            message: "Exercise removed successfully."
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to remove exercise.",
            error: error.message
        });
    }
};

// @desc    Seed starter exercise data
// @route   POST /api/exercises/seed
// @access  Private
const seedExercises = async (req, res) => {
    try {
        const starterExercises = [
            {
                name: "Running",
                category: "Cardio",
                targetMuscle: "Full Body",
                difficulty: "Intermediate",
                caloriesBurnedPerMinute: 10,
                equipment: "None",
                instructions: "Run at a steady pace. Warm up before starting and cool down after finishing."
            },
            {
                name: "Walking",
                category: "Cardio",
                targetMuscle: "Full Body",
                difficulty: "Beginner",
                caloriesBurnedPerMinute: 4,
                equipment: "None",
                instructions: "Walk at a comfortable pace while maintaining good posture."
            },
            {
                name: "Cycling",
                category: "Cardio",
                targetMuscle: "Legs",
                difficulty: "Beginner",
                caloriesBurnedPerMinute: 8,
                equipment: "Bicycle",
                instructions: "Cycle at a moderate pace. Keep your back straight and maintain stable breathing."
            },
            {
                name: "Weight Lifting",
                category: "Strength",
                targetMuscle: "Full Body",
                difficulty: "Intermediate",
                caloriesBurnedPerMinute: 6,
                equipment: "Dumbbells/Barbell",
                instructions: "Use proper form and progressive overload. Rest between sets."
            },
            {
                name: "Push-Ups",
                category: "Strength",
                targetMuscle: "Chest, Shoulders, Triceps",
                difficulty: "Beginner",
                caloriesBurnedPerMinute: 7,
                equipment: "None",
                instructions: "Keep your body straight and lower your chest close to the floor."
            },
            {
                name: "Squats",
                category: "Strength",
                targetMuscle: "Legs, Glutes",
                difficulty: "Beginner",
                caloriesBurnedPerMinute: 8,
                equipment: "None",
                instructions: "Keep your chest up, push hips back, and squat to a comfortable depth."
            },
            {
                name: "Bench Press",
                category: "Strength",
                targetMuscle: "Chest, Shoulders, Triceps",
                difficulty: "Intermediate",
                caloriesBurnedPerMinute: 6,
                equipment: "Barbell/Bench",
                instructions: "Lower the bar under control and press upward while keeping your shoulders stable."
            },
            {
                name: "Deadlift",
                category: "Strength",
                targetMuscle: "Back, Legs, Glutes",
                difficulty: "Advanced",
                caloriesBurnedPerMinute: 9,
                equipment: "Barbell",
                instructions: "Keep your back neutral, brace your core, and lift using hips and legs."
            },
            {
                name: "Yoga",
                category: "Flexibility",
                targetMuscle: "Full Body",
                difficulty: "Beginner",
                caloriesBurnedPerMinute: 3,
                equipment: "Mat",
                instructions: "Perform controlled movements and focus on breathing."
            },
            {
                name: "Plank",
                category: "Strength",
                targetMuscle: "Core",
                difficulty: "Beginner",
                caloriesBurnedPerMinute: 4,
                equipment: "None",
                instructions: "Keep your body straight and hold your core tight."
            },
            {
                name: "Swimming",
                category: "Cardio",
                targetMuscle: "Full Body",
                difficulty: "Intermediate",
                caloriesBurnedPerMinute: 9,
                equipment: "Pool",
                instructions: "Swim at a steady pace and maintain breathing rhythm."
            },
            {
                name: "Jump Rope",
                category: "Cardio",
                targetMuscle: "Full Body",
                difficulty: "Intermediate",
                caloriesBurnedPerMinute: 12,
                equipment: "Jump Rope",
                instructions: "Jump lightly on the balls of your feet and keep wrists relaxed."
            }
        ];

        let insertedCount = 0;
        let skippedCount = 0;

        for (const exerciseData of starterExercises) {
            const exists = await Exercise.findOne({
                name: { $regex: new RegExp(`^${exerciseData.name}$`, "i") }
            });

            if (exists) {
                skippedCount++;
            } else {
                await Exercise.create({
                    ...exerciseData,
                    createdBy: req.user._id
                });
                insertedCount++;
            }
        }

        return res.status(201).json({
            success: true,
            message: "Starter exercises seeded successfully.",
            insertedCount,
            skippedCount
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to seed exercises.",
            error: error.message
        });
    }
};

module.exports = {
    createExercise,
    getExercises,
    getExerciseById,
    updateExercise,
    deleteExercise,
    seedExercises
};