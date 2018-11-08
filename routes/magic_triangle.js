import express from "express";

const router = express.Router();

/* GET users listing. */
router.get("/", (req, res) => {
	res.render("magic_triangle", {
		title: "Magic Triangle",
		breadcrumbs: [
			{title: "Help & self-help", uri: "help"},
			{title: "Magic triangle",   uri: "help/magic-triangle"},
		],
	});
});

module.exports = router;
