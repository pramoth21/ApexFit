const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");

// Load environment variables
dotenv.config();

// Initialize app
const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =========================
// Database Connection
// =========================
mongoose.connect(process.env.MONGODB_URL)
    .then(() => console.log("✅ MongoDB Connected Successfully"))
    .catch((err) => console.log("❌ MongoDB Connection Failed:", err));

// =========================
// Basic Test Route
// =========================
app.get("/", (req, res) => {
    res.send("🔥 ApexFit Backend is Running...");
});

// =========================
// Routes (ADD YOUR ROUTES HERE LATER)
// =========================
// Example:
// app.use("/api/auth", require("./routes/authRoutes"));
// app.use("/api/users", require("./routes/userRoutes"));
// app.use("/api/coaches", require("./routes/coachRoutes"));

// =========================
// Socket.io Chat System
// =========================
io.on("connection", (socket) => {
    console.log("🟢 User connected:", socket.id);

    // Join user room
    socket.on("join_room", (room) => {
        socket.join(room);
        console.log(`User joined room: ${room}`);
    });

    // Send message
    socket.on("send_message", (data) => {
        socket.to(data.room).emit("receive_message", data);
    });

    // Disconnect
    socket.on("disconnect", () => {
        console.log("🔴 User disconnected:", socket.id);
    });
});

// =========================
// Start Server
// =========================
const PORT = process.env.PORT || 8070;

server.listen(PORT, () => {
    console.log(`🚀 ApexFit Server running on port ${PORT}`);
});