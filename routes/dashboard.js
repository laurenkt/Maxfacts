import express from "express"
import { ensureLoggedIn } from "connect-ensure-login"
import User from "../models/user.js"
import Option from "../models/option.js"

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
router.use("/videos",    require("./dashboard/videos.js"))
router.use("/directory", require("./dashboard/directory.js"))

router.get("/", getOverview)
router.post("/", postOverview)

async function getOverview(req, res) {
	const options = await Option.all()

	res.render("dashboard/overview", {
		layout: "dashboard",
		options
	})
}

async function postOverview(req, res) {
	for (let property in req.body) {
		await Option.set(property, req.body[property])
	}

	return getOverview(req, res)
}

module.exports = router
