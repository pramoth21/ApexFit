const Message = require("../models/Message");
const User = require("../models/User");
const { buildConversationId } = require("../utils/conversation");

// @desc    Get full message history with one other user
// @route   GET /api/messages/:userId
// @access  Private
const getConversation = async (req, res) => {
    try {
        const otherUserId = req.params.userId;
        const conversationId = buildConversationId(req.user._id, otherUserId);

        const messages = await Message.find({ conversationId })
            .sort({ createdAt: 1 })
            .populate("sender", "name");

        // Mark any unread messages sent TO me as read, now that I've opened this chat
        await Message.updateMany(
            { conversationId, receiver: req.user._id, isRead: false },
            { isRead: true }
        );

        return res.status(200).json({
            success: true,
            count: messages.length,
            messages
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch conversation.",
            error: error.message
        });
    }
};

// @desc    Get a list of all conversations the logged-in user is part of,
//          with the last message and unread count for each (for an inbox view)
// @route   GET /api/messages
// @access  Private
const getMyConversations = async (req, res) => {
    try {
        const userId = req.user._id;

        const grouped = await Message.aggregate([
            {
                $match: {
                    $or: [{ sender: userId }, { receiver: userId }]
                }
            },
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: "$conversationId",
                    lastMessage: { $first: "$$ROOT" }
                }
            },
            { $sort: { "lastMessage.createdAt": -1 } }
        ]);

        const conversations = await Promise.all(
            grouped.map(async (item) => {
                const msg = item.lastMessage;
                const otherUserId = msg.sender.toString() === userId.toString() ? msg.receiver : msg.sender;
                const otherUser = await User.findById(otherUserId).select("name email");

                const unreadCount = await Message.countDocuments({
                    conversationId: item._id,
                    receiver: userId,
                    isRead: false
                });

                return {
                    conversationId: item._id,
                    otherUser,
                    lastMessage: msg,
                    unreadCount
                };
            })
        );

        return res.status(200).json({
            success: true,
            count: conversations.length,
            conversations
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch conversations.",
            error: error.message
        });
    }
};

module.exports = {
    getConversation,
    getMyConversations
};