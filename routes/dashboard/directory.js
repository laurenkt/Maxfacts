import express from "express"
import Content from "../../models/content"

const router = express.Router()

router.get("/",               getPageList)
router.get("/delete/:uri(*)", getDeletePage)
router.get("/new",            getNewPage)
router.get("/:uri(*)",        getPage)
router.get("/broken-links",   getBrokenLinks)
router.get("/unattributed",   getUnattributed)
router.get("/graph",          getGraph)

router.post("/new",          postNewPage)
router.post("/broken-links", postBrokenLinks)
router.post("/unattributed", postUnattributed)
router.post("/:uri(*)",      postPage)

async function getGraph(req, res) {
	return req;
}

async function getPageList(req, res) {
	const hasBody = item => item.body && item.body != ""

	const items = await Content.find().sort("uri").exec()

	await Promise.all(items.map(async item => {
		item.is_empty = hasBody(item) ? false : 
			item.type == "directory" ? (await Content.findFromParentURI(item.uri).exec()).length == 0 :
			true
		item.invalid_links_count = (await item.getInvalidLinks()).length
	}))

	if (req.accepts("text/html")) {
		res.render("dashboard/directory", {
			items,
			layout: "dashboard",
		})
	} else {
		res.json(items);
	}
}

async function getDeletePage(req, res) {
	if (req.query.hasOwnProperty("confirm")) {
		await Content.remove({uri: req.params.uri}).exec()
		
		res.redirect("/dashboard/directory")
	}
	else {
		throw new Error("Deletion must contain confirm token in URL query string")
	}
}

async function getBrokenLinks(req, res) {
	const items = await Content.find().sort('uri').exec()

	let pages = {}

	for (let i = 0; i < items.length; i++) {
		const invalid_links = await items[i].getInvalidLinks()
		if (invalid_links.length > 0)
			pages[items[i].uri] = invalid_links
	}

	res.render("dashboard/broken-links", {
		layout: "dashboard",
		pages	
	})
}

async function getUnattributed(req, res) {
	const pages = await Content.findWithNoAuthorship()
		.select('uri title type')
		.sort('uri')
		.exec()

	pages.forEach(page => page.parents = page.uri.split('/').slice(0, -1))

	res.render("dashboard/unattributed", {
		layout: "dashboard",
		pages	
	})
}

async function postBrokenLinks(req, res) {
	let find = []
	let replace = []

	for (let uri in req.body) {
		// if item is an array then there are multiple vals, just take the first
		if (typeof req.body[uri].find === "function")
			req.body[uri] = req.body[uri].find(str => str != "")

		if (req.body[uri] != "" && req.body[uri] != undefined) {
			find.push(uri)
			replace.push(req.body[uri][0] == '/' ? req.body[uri] : '/' + req.body[uri])
		}
	}


	// Now update all pages
	const all_pages = await Content
		.find({body: { $regex : `(${find.join('|')})` }})
		.exec()

	for (let i = 0; i < all_pages.length; i++) {
		all_pages[i].replaceHREFsWith(find, replace)
		await all_pages[i].save()
	}

	res.redirect('/dashboard/directory/broken-links')
}

async function postUnattributed(req, res) {
	for (let uri in req.body) {
		if (req.body[uri]) {
			let content = await Content.findOne({uri}).exec()
			content.authorship = req.body[uri]
			await content.save()
		}
	}

	res.redirect('/dashboard/directory/unattributed')
}

async function getNewPage(req, res) {
	const all_uris = await Content.getAllURIs()

	res.render("dashboard/content", {
		all_uris,
		id: req.query.id ? req.query.id.replace(/\//, '') : undefined,
		layout:"dashboard"
	})
}

async function postNewPage(req, res) {
	// Normalize has_sublist checkbox
	req.body.has_sublist = req.body.has_sublist && req.body.has_sublist === "on"

	const content = new Content(req.body)
	
	try {
		const saved_content = await content.save()

		res.flash('saved', content)
		res.redirect(`/dashboard/directory/${saved_content.uri}`)
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
}

async function getPage(req, res, next) {
	let content = await Content.findOne( {uri: req.params.uri} ).exec()

	if (!content)
		return next()

	const set_key = key => value => content.set(key, value, {strict: false})

	// Find invalid URIs and images
	await Promise.all([
		Content.getAllURIs().then(set_key('all_uris')),
		content.getInvalidLinks().then(set_key('invalid_uris')),
		content.getImages().then(set_key('images')),
	])

	content = content.toObject()

	// Determines whether to show notice about content being saved
	content.saved = req.query.hasOwnProperty("saved")
	// Prepare selected structure for template to render the select box
	// This has to be done like this because Handlebars doesn't have a form builder
	content.selected = {}
	content.selected[content.type || "page"] = "selected"
	// Use alternate page layout for dashboard
	content.layout = "dashboard"
	res.render("dashboard/content", content)
}

/**
 * Create or update a content item and then redirect back to the edit page
 */
async function postPage(req, res) {
	const item = await Content.findOne({uri: req.params.uri}).exec()

	for (let property in req.body) {
		item[property] = req.body[property]
	}

	// Normalize checkboxes
	item.has_sublist = req.body.has_sublist && req.body.has_sublist === "on"

	// Redirect after saving
	try {
		await item.save()
		res.flash('saved', item)
		res.redirect(`/dashboard/directory/${item.uri}`)
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
}

module.exports = router
