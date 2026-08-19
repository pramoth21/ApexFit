const express = require("express");
const router = express.Router();

const {
    createSupplement,
    getAllSupplements,
    getSupplementById,
    updateSupplement,
    deleteSupplement,
    getMyRecommendations
} = require("../controllers/supplementController");

const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const uploadSupplementImage = require("../middleware/uploadSupplementImage");

// IMPORTANT: /recommendations must come BEFORE /:id,
// otherwise Express will treat "recommendations" as an :id value
router.get("/recommendations", protect, getMyRecommendations);

router.get("/", getAllSupplements);
router.get("/:id", getSupplementById);

router.post("/", protect, authorizeRoles("admin"), uploadSupplementImage.single("image"), createSupplement);
router.put("/:id", protect, authorizeRoles("admin"), uploadSupplementImage.single("image"), updateSupplement);
router.delete("/:id", protect, authorizeRoles("admin"), deleteSupplement);

module.exports = router;