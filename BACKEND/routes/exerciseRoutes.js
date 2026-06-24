const express = require("express");

const {
    createExercise,
    getExercises,
    getExerciseById,
    updateExercise,
    deleteExercise,
    seedExercises
} = require("../controllers/exerciseController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/seed", protect, seedExercises);

router.route("/")
    .post(protect, createExercise)
    .get(protect, getExercises);

router.route("/:id")
    .get(protect, getExerciseById)
    .put(protect, updateExercise)
    .delete(protect, deleteExercise);

module.exports = router;