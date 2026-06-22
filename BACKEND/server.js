const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");

const connectDB = require("./config/db");

dotenv.config();

const app = express();
const server = http.createServer(app);

// =========================
// Database Connection
// =========================
connectDB();

// =========================
// Socket.io Setup
// =========================
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || "*",
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

// =========================
// Middleware
// =========================
app.use(
    cors({
        origin: process.env.CLIENT_URL || "*",
        credentials: true
    })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =========================
// Basic Test Route
// =========================
app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "🔥 Apex-Fit Backend is Running..."
    });
});

// =========================
// API Routes
// =========================
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/foods", require("./routes/foodRoutes"));
app.use("/api/meals", require("./routes/mealRoutes"));

// =========================
// Socket.io Chat System
// Future Coach Marketplace Chat
// =========================
io.on("connection", (socket) => {
    console.log("🟢 User connected:", socket.id);

    socket.on("join_room", (room) => {
        socket.join(room);
        console.log(`User joined room: ${room}`);
    });

    socket.on("send_message", (data) => {
        socket.to(data.room).emit("receive_message", data);
    });

    socket.on("disconnect", () => {
        console.log("🔴 User disconnected:", socket.id);
    });
});

// =========================
// 404 Route
// =========================
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "API route not found."
    });
});

// =========================
// Start Server
// =========================
const PORT = process.env.PORT || 8070;

server.listen(PORT, () => {
    console.log(`🚀 Apex-Fit Server running on port ${PORT}`);
});