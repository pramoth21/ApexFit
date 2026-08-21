const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, "..", "uploads", "coaches"));
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Only image files (jpg, jpeg, png, webp) are allowed."), false);
    }
};

const uploadCoachImages = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB per file
    }
});

// Accepts ONE profileImage and up to FOUR galleryImages in the same request
const coachImageFields = uploadCoachImages.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "galleryImages", maxCount: 4 }
]);

module.exports = coachImageFields;