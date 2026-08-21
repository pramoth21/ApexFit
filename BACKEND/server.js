const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const connectDB = require("./config/db");
const initSocketServer = require("./socket/socketServer");

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

initSocketServer(io);

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
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

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
app.use("/api/exercises", require("./routes/exerciseRoutes"));
app.use("/api/workouts", require("./routes/workoutRoutes"));
app.use("/api/progress", require("./routes/progressRoutes"));
app.use("/api/supplements", require("./routes/supplementRoutes"));
app.use("/api/recipes", require("./routes/recipeRoutes"));
app.use("/api/feedback", require("./routes/feedbackRoutes"));
app.use("/api/coaches", require("./routes/coachRoutes"));
app.use("/api/bookings", require("./routes/bookingRoutes"));
app.use("/api/messages", require("./routes/messageRoutes"));

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