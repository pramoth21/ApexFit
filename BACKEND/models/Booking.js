const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
    {
        client: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        coach: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "CoachProfile",
            required: true
        },

        status: {
            type: String,
            enum: ["Pending", "Accepted", "Rejected", "Completed"],
            default: "Pending"
        },

        message: {
            type: String,
            trim: true,
            default: ""
        },

        coachResponseNote: {
            type: String,
            trim: true,
            default: ""
        },

        requestedSessionDate: {
            type: Date,
            default: null
        },

        // Snapshot of the coach's price at the time of booking,
        // so a later price change doesn't rewrite history
        priceAtBooking: {
            type: Number,
            required: true
        },

        respondedAt: {
            type: Date,
            default: null
        },

        completedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

bookingSchema.index({ client: 1, createdAt: -1 });
bookingSchema.index({ coach: 1, status: 1 });

module.exports = mongoose.model("Booking", bookingSchema);