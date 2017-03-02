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

router.get("/delete/:uri(*)", (req, res) => {
	if (req.query.hasOwnProperty("confirm")) {
		Content.remove({uri: req.params.uri}).exec().then(() => res.redirect("/dashboard/directory"));
	}
	else {
		throw new Error("Deletion must contain confirm token in URL query string");
	}
});

router.get("/new", (req, res) => {
	Content.getAllURIs()
		.then(all_uris =>
			res.render("dashboard/content", {all_uris, layout:"dashboard"})
		);
});

router.post("/new", (req, res) => {
	// Normalize has_sublist checkbox
	req.body.has_sublist = req.body.has_sublist && req.body.has_sublist === "on";

	var content = new Content(req.body);
	content.save()
		.then(saved_content => res.redirect(`/dashboard/directory/${saved_content.uri}?saved`))
		.catch(err => {
			// Prepopulate with what was filled in
			let item = {...req.body};
			item.error = err;
			// Prepare selected structure for template to render the select box
			// This has to be done like this because Handlebars doesn't have a form builder
			item.selected = {};
			item.selected[item.type || "page"] = "selected";
			item.layout = "dashboard";
			res.render("dashboard/content", item);
		});
});

router.get("/:uri(*)", (req, res, next) => {
	Content
		.findOne( {uri: req.params.uri} )
		.exec()
		.then(content => {
			if (!content)
				next();

			else
				return content;
		})
		.then(content =>
			// Find invalid URIs and images
			Promise.all([
				Content.getAllURIs().then(uris => content.all_uris = uris),
				content.getInvalidLinks().then(uris => content.invalid_uris = uris),
				content.getImages().then(images => content.images = images),
			]).then(_ => content)
		)
		.then(content => {
			// Determines whether to show notice about content being saved
			content.saved = req.query.hasOwnProperty("saved");
			// Prepare selected structure for template to render the select box
			// This has to be done like this because Handlebars doesn't have a form builder
			content.selected = {};
			content.selected[content.type || "page"] = "selected";
			// Use alternate page layout for dashboard
			content.layout = "dashboard";
			res.render("dashboard/content", content);
		})
		.catch(console.error.bind(console));
});

router.post("/:uri(*)", (req, res) => {
	Content.findOne({uri: req.params.uri}).exec().then(item => {
		item.uri         = req.body.uri;
		item.title       = req.body.title;
		item.type        = req.body.type;
		item.body        = req.body.body;
		item.surtitle    = req.body.surtitle;
		item.description = req.body.description;
		item.order       = req.body.order;

		// Normalize checkboxes
		item.has_sublist = req.body.has_sublist && req.body.has_sublist === "on";

		// Redirect after saving
		return item.save()
			.then(() => res.redirect(`/dashboard/directory/${item.uri}?saved`))
			.catch(err => {
				item.error = err;
				// Prepare selected structure for template to render the select box
				// This has to be done like this because Handlebars doesn't have a form builder
				item.selected = {};
				item.selected[item.type || "page"] = "selected";
				item.layout = "dashboard";
				res.render("dashboard/content", item);
			});
	})
	.catch(console.error.bind(console));
});

module.exports = router;
