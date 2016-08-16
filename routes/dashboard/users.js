import express from "express";

const router = express.Router();

router.get("/", (req, res) => {
	res.render("dashboard/overview", {layout: "layout-dashboard"});
});

module.exports = router;
