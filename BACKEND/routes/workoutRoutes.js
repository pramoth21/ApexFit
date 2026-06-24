const express = require("express");

const {
    createWorkout,
    getUserWorkouts,
    getWorkoutById,
    updateWorkout,
    deleteWorkout,
    getDailyWorkoutSummary,
    getWeeklyWorkoutSummary
} = require("../controllers/workoutController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/summary/daily", protect, getDailyWorkoutSummary);
router.get("/summary/weekly", protect, getWeeklyWorkoutSummary);

router.route("/")
    .post(protect, createWorkout)
    .get(protect, getUserWorkouts);

router.route("/:id")
    .get(protect, getWorkoutById)
    .put(protect, updateWorkout)
    .delete(protect, deleteWorkout);

module.exports = router;