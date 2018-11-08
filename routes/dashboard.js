import express from "express"
import { ensureLoggedIn } from "connect-ensure-login"
import Option from "../models/option.js"
import Content from "../models/content.js"

const router = express.Router()

// Require log-in
router.use(ensureLoggedIn("/auth"))

router.use("/users",     require("./dashboard/users.js"))
router.use("/images",    require("./dashboard/images.js"))
router.use("/videos",    require("./dashboard/videos.js"))
router.use("/directory", require("./dashboard/directory.js"))

router.get("/", getOverview)
router.post("/", postOverview)

async function getOverview(req, res) {
	const options = await Option.all()

	const unattributed = (await Content.findWithNoAuthorship().select('uri').exec()).length

	const all_pages = await Content.find().where('body').ne('').exec()

	let broken_links = 0
	for (let i = 0; i < all_pages.length; i++) {
		if ((await all_pages[i].getInvalidLinks()).length > 0)
			broken_links++
	}

	res.render("dashboard/overview", {
		layout: "dashboard",
		options,
		unattributed,
		broken_links
	})
}

async function postOverview(req, res) {
	for (let property in req.body) {
		await Option.set(property, req.body[property])
	}

	return getOverview(req, res)
}

module.exports = router
