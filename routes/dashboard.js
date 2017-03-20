import express from "express"
import { ensureLoggedIn } from "connect-ensure-login"
import User from "../models/user.js"

const router = express.Router()

router.get(/\/.*/i, ensureLoggedIn("/auth"), async (req, res, next) => {
	const is_user_valid = await User.doesUserExist(req.user)
	
	if (is_user_valid) {
		res.locals.user = req.user
		next()
	}
	else {
		res.status(403)
		res.render("dashboard/forbidden", {email:req.user, layout: "dashboard"})
	}
})

router.use("/users",     require("./dashboard/users.js"))
router.use("/images",    require("./dashboard/images.js"))
router.use("/directory", require("./dashboard/directory.js"))

router.get("/", requestOverview)

function requestOverview(req, res) {
	res.render("dashboard/overview", {layout: "dashboard"})
}

module.exports = router
