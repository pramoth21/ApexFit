const express = require("express");
const router = express.Router();

const { getSmartFeedback } = require("../controllers/feedbackController");
const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, getSmartFeedback);

module.exports = router;