__path = process.cwd();
const express = require("express");
const router = express.Router();
const YoutubeSearch = require("../lib/youtube");

router.get("/", async(req, res) => {
    res.status(400).json({
        author: "FatihArridho",
        message: "Ooopss, you can go to router /search for more details."
    })
})
router.get("/search", async(req, res) => {
    let channel = req.query.channel
    let video = req.query.video
    let playlist = req.query.playlist
    let all = req.query.all

    if (channel) {
        let result = await YoutubeSearch(channel);
        if (result.channel.length == 0) return res.status(400).json({
            author: "FatihArridho",
            message: "Channel not found."
        });
        res.status(200).json({
            author: "FatihArridho",
            result: result.channel
        });
    } else if (video) {
        let result = await YoutubeSearch(video);
        if (result.video.length == 0) return res.status(400).json({
            author: "FatihArridho",
            message: "Video not found."
        });
        res.status(200).json({
            author: "FatihArridho",
            result: result.video
        });
    } else if (playlist) {
        let result = await YoutubeSearch(playlist);
        if (result.playlist.length == 0) return res.status(400).json({
            author: "FatihArridho",
            message: "Playlist not found."
        });
        res.status(200).json({
            author: "FatihArridho",
            result: result.playlist
        });
    } else if (all) {
        let result = await YoutubeSearch(all);
        res.status(200).json({
            author: "FatihArridho",
            result
        })
    } else {
        res.status(400).json({
            author: "FatihArridho",
            message: "Enter parameters, available parameters: channel, video, playlist, all."
        })
    }
});

module.exports = router;