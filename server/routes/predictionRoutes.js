const express = require("express");

const {
    getPrediction,
} = require("../controllers/predictionController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();


// Every prediction request requires login
router.use(authMiddleware);


// GET ML prediction
router.get("/", getPrediction);


module.exports = router;