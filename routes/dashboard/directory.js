import express from "express"
import Content from "../../models/content"

const router = express.Router()

router.get("/", async (req, res) => {
	const hasBody = item => item.body && item.body != ""

	const items = await Content.find().sort("uri").exec()

	await Promise.all(items.map(async item => {
		item.is_empty = hasBody(item) ? false : 
			item.type == "directory" ? (await Content.findFromParentURI(item.uri).exec()).length == 0 :
			true
		item.invalid_links_count = (await item.getInvalidLinks()).length
	}))

	res.render("dashboard/directory", {
		items,
		layout: "dashboard",
	})
})

router.get("/delete/:uri(*)", async (req, res) => {
	if (req.query.hasOwnProperty("confirm")) {
		await Content.remove({uri: req.params.uri}).exec()
		
		res.redirect("/dashboard/directory")
	}
	else {
		throw new Error("Deletion must contain confirm token in URL query string")
	}
})

router.get("/new", async (req, res) => {
	const all_uris = await Content.getAllURIs()

	res.render("dashboard/content", {all_uris, layout:"dashboard"})
})

router.post("/new", async (req, res) => {
	// Normalize has_sublist checkbox
	req.body.has_sublist = req.body.has_sublist && req.body.has_sublist === "on"

	const content = new Content(req.body)
	
	try {
		const saved_content = await content.save()

		res.redirect(`/dashboard/directory/${saved_content.uri}?saved`)
	}
	catch (err) {
		// Prepopulate with what was filled in
		let item = {...req.body}
		item.error = err
		// Prepare selected structure for template to render the select box
		// This has to be done like this because Handlebars doesn't have a form builder
		item.selected = {}
		item.selected[item.type || "page"] = "selected"
		item.layout = "dashboard"
		res.render("dashboard/content", item)
	}
})

router.get("/:uri(*)", async (req, res, next) => {
	const content = await Content.findOne( {uri: req.params.uri} ).exec()

	if (!content)
		return next()

	// Find invalid URIs and images
	await Promise.all([
		Content.getAllURIs().then(uris => content.all_uris = uris),
		content.getInvalidLinks().then(uris => content.invalid_uris = uris),
		content.getImages().then(images => content.images = images),
	])

	// Determines whether to show notice about content being saved
	content.saved = req.query.hasOwnProperty("saved")
	// Prepare selected structure for template to render the select box
	// This has to be done like this because Handlebars doesn't have a form builder
	content.selected = {}
	content.selected[content.type || "page"] = "selected"
	// Use alternate page layout for dashboard
	content.layout = "dashboard"
	res.render("dashboard/content", content)
})

/**
 * Create or update a content item and then redirect back to the edit page
 */
router.post("/:uri(*)", async (req, res) => {
	const item = await Content.findOne({uri: req.params.uri}).exec()

	for (let property in req.body) {
		item[property] = req.body[property]
	}

	// Normalize checkboxes
	item.has_sublist = req.body.has_sublist && req.body.has_sublist === "on"

	// Redirect after saving
	try {
		await item.save()
		res.redirect(`/dashboard/directory/${item.uri}?saved`)
	}
	catch (err) {
		item.error = err
		// Prepare selected structure for template to render the select box
		// This has to be done like this because Handlebars doesn't have a form builder
		item.selected = {}
		item.selected[item.type || "page"] = "selected"
		item.layout = "dashboard"
		res.render("dashboard/content", item)
	}
})

module.exports = router
