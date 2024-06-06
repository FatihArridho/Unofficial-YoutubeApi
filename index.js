const express = require("express");
const router = express();
const index = require("./router/index.js");
const youtube = require("./router/youtube.js");
const port = 8080;

router.enable("trust proxy");
router.set("json spaces", 2);

router.use("/", index);
router.use("/youtube", youtube);

router.listen(port, async() => {
    console.log(`Active Server on Port ${port}`);
});

module.exports = router;