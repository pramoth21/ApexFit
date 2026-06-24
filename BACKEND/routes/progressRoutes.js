const express = require("express");

const {
    createWeightLog,
    getWeightLogs,
    getWeightLogById,
    updateWeightLog,
    deleteWeightLog,
    getProgressCharts,
    getProgressSummary
} = require("../controllers/progressController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/charts", protect, getProgressCharts);
router.get("/summary", protect, getProgressSummary);

router.route("/weight")
    .post(protect, createWeightLog)
    .get(protect, getWeightLogs);

router.route("/weight/:id")
    .get(protect, getWeightLogById)
    .put(protect, updateWeightLog)
    .delete(protect, deleteWeightLog);

module.exports = router;