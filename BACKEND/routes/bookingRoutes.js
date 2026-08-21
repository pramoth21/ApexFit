const express = require("express");
const router = express.Router();

const {
    createBooking,
    getMyBookingRequests,
    getCoachBookingRequests,
    respondToBooking,
    completeBooking,
    getBookingById
} = require("../controllers/bookingController");

const { protect } = require("../middleware/authMiddleware");

router.post("/", protect, createBooking);
router.get("/my-requests", protect, getMyBookingRequests);
router.get("/coach-requests", protect, getCoachBookingRequests);
router.put("/:id/respond", protect, respondToBooking);
router.put("/:id/complete", protect, completeBooking);
router.get("/:id", protect, getBookingById);

module.exports = router;