const Booking = require("../models/Booking");
const CoachProfile = require("../models/CoachProfile");

// @desc    Client sends a booking request to a coach
// @route   POST /api/bookings
// @access  Private
const createBooking = async (req, res) => {
    try {
        const { coachId, message, requestedSessionDate } = req.body;

        if (!coachId) {
            return res.status(400).json({
                success: false,
                message: "coachId is required."
            });
        }

        const coach = await CoachProfile.findById(coachId);
        if (!coach || !coach.isActive) {
            return res.status(404).json({
                success: false,
                message: "Coach not found."
            });
        }

        if (coach.user.toString() === req.user._id.toString()) {
            return res.status(400).json({
                success: false,
                message: "You cannot book yourself as a coach."
            });
        }

        const booking = await Booking.create({
            client: req.user._id,
            coach: coach._id,
            message,
            requestedSessionDate: requestedSessionDate || null,
            priceAtBooking: coach.pricePerSession
        });

        return res.status(201).json({
            success: true,
            message: "Booking request sent successfully.",
            booking
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to create booking.",
            error: error.message
        });
    }
};

// @desc    Get bookings the logged-in user made as a client
// @route   GET /api/bookings/my-requests
// @access  Private
const getMyBookingRequests = async (req, res) => {
    try {
        const bookings = await Booking.find({ client: req.user._id })
            .populate({
                path: "coach",
                populate: { path: "user", select: "name email" }
            })
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: bookings.length,
            bookings
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch your bookings.",
            error: error.message
        });
    }
};

// @desc    Get booking requests received by the logged-in coach
// @route   GET /api/bookings/coach-requests?status=Pending
// @access  Private/Coach
const getCoachBookingRequests = async (req, res) => {
    try {
        const coachProfile = await CoachProfile.findOne({ user: req.user._id });

        if (!coachProfile) {
            return res.status(404).json({
                success: false,
                message: "Coach profile not found."
            });
        }

        const query = { coach: coachProfile._id };
        if (req.query.status) query.status = req.query.status;

        const bookings = await Booking.find(query)
            .populate("client", "name email")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: bookings.length,
            bookings
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch booking requests.",
            error: error.message
        });
    }
};

// @desc    Coach accepts or rejects a booking request
// @route   PUT /api/bookings/:id/respond
// @access  Private/Coach
const respondToBooking = async (req, res) => {
    try {
        const { status, coachResponseNote } = req.body;

        if (!["Accepted", "Rejected"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "status must be either 'Accepted' or 'Rejected'."
            });
        }

        const coachProfile = await CoachProfile.findOne({ user: req.user._id });
        if (!coachProfile) {
            return res.status(404).json({
                success: false,
                message: "Coach profile not found."
            });
        }

        const booking = await Booking.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found."
            });
        }

        if (booking.coach.toString() !== coachProfile._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "This booking does not belong to you."
            });
        }

        if (booking.status !== "Pending") {
            return res.status(400).json({
                success: false,
                message: `This booking has already been ${booking.status.toLowerCase()}.`
            });
        }

        booking.status = status;
        booking.coachResponseNote = coachResponseNote || "";
        booking.respondedAt = new Date();

        await booking.save();

        // Once accepted, this person becomes an active client — track it
        if (status === "Accepted") {
            coachProfile.totalClients += 1;
            await coachProfile.save();
        }

        return res.status(200).json({
            success: true,
            message: `Booking ${status.toLowerCase()} successfully.`,
            booking
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to respond to booking.",
            error: error.message
        });
    }
};

// @desc    Coach marks an accepted booking as completed
// @route   PUT /api/bookings/:id/complete
// @access  Private/Coach
const completeBooking = async (req, res) => {
    try {
        const coachProfile = await CoachProfile.findOne({ user: req.user._id });
        if (!coachProfile) {
            return res.status(404).json({
                success: false,
                message: "Coach profile not found."
            });
        }

        const booking = await Booking.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found."
            });
        }

        if (booking.coach.toString() !== coachProfile._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "This booking does not belong to you."
            });
        }

        if (booking.status !== "Accepted") {
            return res.status(400).json({
                success: false,
                message: "Only accepted bookings can be marked as completed."
            });
        }

        booking.status = "Completed";
        booking.completedAt = new Date();
        await booking.save();

        return res.status(200).json({
            success: true,
            message: "Booking marked as completed.",
            booking
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to complete booking.",
            error: error.message
        });
    }
};

// @desc    Get a single booking (must be the client or the coach involved)
// @route   GET /api/bookings/:id
// @access  Private
const getBookingById = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id)
            .populate("client", "name email")
            .populate({
                path: "coach",
                populate: { path: "user", select: "name email" }
            });

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found."
            });
        }

        const isClient = booking.client._id.toString() === req.user._id.toString();
        const isCoach = booking.coach.user._id.toString() === req.user._id.toString();

        if (!isClient && !isCoach) {
            return res.status(403).json({
                success: false,
                message: "You do not have access to this booking."
            });
        }

        return res.status(200).json({
            success: true,
            booking
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch booking.",
            error: error.message
        });
    }
};

module.exports = {
    createBooking,
    getMyBookingRequests,
    getCoachBookingRequests,
    respondToBooking,
    completeBooking,
    getBookingById
};