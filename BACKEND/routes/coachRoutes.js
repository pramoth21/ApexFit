const express = require("express");
const router = express.Router();

const {
    registerAsCoach,
    updateMyCoachProfile,
    getMyCoachProfile,
    getAllCoaches,
    getCoachById
} = require("../controllers/coachController");

const { protect } = require("../middleware/authMiddleware");
const coachImageFields = require("../middleware/uploadCoachImages");

// IMPORTANT: /me must come BEFORE /:id
router.get("/me", protect, getMyCoachProfile);

router.post("/register", protect, coachImageFields, registerAsCoach);
router.put("/profile", protect, coachImageFields, updateMyCoachProfile);

router.get("/", getAllCoaches);
router.get("/:id", getCoachById);

module.exports = router;