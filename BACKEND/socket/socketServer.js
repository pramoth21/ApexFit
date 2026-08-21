const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Message = require("../models/Message");
const CoachProfile = require("../models/CoachProfile");
const Booking = require("../models/Booking");
const { buildConversationId } = require("../utils/conversation");

// Tracks who's currently online: userId -> Set of socket connection IDs
// (a Set, not a single ID, because one user can have multiple tabs open)
const onlineUsers = new Map();

const canUsersMessage = async (userIdA, userIdB) => {
    const coachProfiles = await CoachProfile.find({
        user: { $in: [userIdA, userIdB] }
    });

    if (coachProfiles.length === 0) return false;

    const coachProfileIds = coachProfiles.map((profile) => profile._id);

    const booking = await Booking.findOne({
        coach: { $in: coachProfileIds },
        client: { $in: [userIdA, userIdB] },
        status: { $in: ["Accepted", "Completed"] }
    });

    return !!booking;
};

const initSocketServer = (io) => {
    // Runs once per new connection, BEFORE "connection" fires,
    // to check the JWT token the client sent
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;

            if (!token) {
                return next(new Error("Authentication error: no token provided."));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id).select("-password");

            if (!user) {
                return next(new Error("Authentication error: user not found."));
            }

            socket.userId = user._id.toString();
            socket.userName = user.name;
            next();
        } catch (error) {
            next(new Error("Authentication error: invalid token."));
        }
    });

    io.on("connection", (socket) => {
        const userId = socket.userId;
        console.log(`Socket connected: ${socket.userName} (${userId})`);

        if (!onlineUsers.has(userId)) {
            onlineUsers.set(userId, new Set());
        }
        onlineUsers.get(userId).add(socket.id);

        // Puts this socket in a "room" named after their own userId,
        // so we can send them a message with io.to(userId) later
        // without tracking raw socket IDs ourselves.
        socket.join(userId);

        // Tell everyone this user just came online
        io.emit("user_online", { userId });

        // Client can ask "who's online right now?" on page load
        socket.on("get_online_users", () => {
            socket.emit("online_users_list", Array.from(onlineUsers.keys()));
        });

        socket.on("send_message", async (data) => {
            try {
                const { receiverId, text } = data;

                if (!receiverId || !text || !text.trim()) {
                    socket.emit("message_error", { message: "receiverId and text are required." });
                    return;
                }

                const allowed = await canUsersMessage(userId, receiverId);
                if (!allowed) {
                    socket.emit("message_error", {
                        message: "You can only message a coach/client you have an accepted booking with."
                    });
                    return;
                }

                const conversationId = buildConversationId(userId, receiverId);

                const message = await Message.create({
                    sender: userId,
                    receiver: receiverId,
                    conversationId,
                    text: text.trim()
                });

                const populatedMessage = await message.populate("sender", "name");

                // Send to the receiver (if they're online) AND back to the
                // sender (so their other open tabs/devices see it too)
                io.to(receiverId).emit("receive_message", populatedMessage);
                io.to(userId).emit("receive_message", populatedMessage);
            } catch (error) {
                socket.emit("message_error", { message: "Failed to send message.", error: error.message });
            }
        });

        socket.on("typing", (data) => {
            io.to(data.receiverId).emit("user_typing", { userId });
        });

        socket.on("stop_typing", (data) => {
            io.to(data.receiverId).emit("user_stop_typing", { userId });
        });

        socket.on("disconnect", () => {
            const userSockets = onlineUsers.get(userId);
            if (userSockets) {
                userSockets.delete(socket.id);
                if (userSockets.size === 0) {
                    onlineUsers.delete(userId);
                    io.emit("user_offline", { userId });
                }
            }
            console.log(`Socket disconnected: ${socket.userName} (${userId})`);
        });
    });
};

module.exports = initSocketServer;