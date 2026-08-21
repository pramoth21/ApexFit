const express = require("express");
const router = express.Router();

const { getConversation, getMyConversations } = require("../controllers/messageController");
const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, getMyConversations);
router.get("/:userId", protect, getConversation);

module.exports = router;