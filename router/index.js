__path = process.cwd();
const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
    res.status(200).json({
        author: "FatihArridho",
        message: "Hello World!"
    });
});

module.exports = router;