const express = require("express");
const {
    getUserProfile,
    updateUserProfile,
    changePassword,
    deactivateAccount
} = require("../controllers/userController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/profile", protect, getUserProfile);
router.put("/profile", protect, updateUserProfile);
router.put("/change-password", protect, changePassword);
router.put("/deactivate", protect, deactivateAccount);

module.exports = router;