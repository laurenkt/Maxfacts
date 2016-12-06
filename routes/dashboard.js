import express from "express";
import { ensureLoggedIn } from "connect-ensure-login";

const router = express.Router();

router.use("/users",     require("./dashboard/users.js"));
router.use("/images",    require("./dashboard/images.js"));
router.use("/directory", require("./dashboard/directory.js"));

router.get("/", (req, res) => {
	ensureLoggedIn("/dashboard/auth");
	console.log(req.user);
	res.render("dashboard/overview", {layout: "layout-dashboard"});
});

module.exports = router;
