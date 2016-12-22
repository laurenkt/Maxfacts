import express from "express";
import { ensureLoggedIn } from "connect-ensure-login";

const router = express.Router();

router.get(/\/.*/i, ensureLoggedIn("/auth"), (req, res, next) => {
	res.locals.user = req.user;
	next();
});

router.use("/users",     require("./dashboard/users.js"));
router.use("/images",    require("./dashboard/images.js"));
router.use("/directory", require("./dashboard/directory.js"));

router.get("/", (req, res) => {
	res.render("dashboard/overview", {layout: "dashboard"});
});

module.exports = router;
