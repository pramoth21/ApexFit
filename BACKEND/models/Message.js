const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
    {
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        receiver: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        // Both users always share the same conversationId,
        // so a group query pulls their full chat history in one go
        conversationId: {
            type: String,
            required: true,
            index: true
        },

        text: {
            type: String,
            required: [true, "Message text is required"],
            trim: true
        },

        isRead: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Message", messageSchema);