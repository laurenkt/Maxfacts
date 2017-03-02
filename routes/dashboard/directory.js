import express from "express";
import Content from "../../models/content";
import {difference} from "lodash";

const router = express.Router();

router.get("/", (req, res) => {
	const hasBody = item => item.body && item.body != "";

	Content.find().sort("title").exec().then(items => 
		Promise
			.all(
				items.map(item =>
					Promise.all([
						item.getInvalidLinks().then(uris => uris.length),
						hasBody(item) ?
							Promise.resolve(false) :
							item.type == "directory" ?
								Content.findFromParentURI(item.uri).exec().then(children => children.length == 0) :
								Promise.resolve(true),
					])
					.then(([length, is_empty]) => {
						item.is_empty = is_empty;
						item.invalid_links_count = length;
					})
				)
			)
			.then(() => {
				const number_of_slashes = s => (s.match(/\//g) || []).length;
				var items_by_slashes = [];
				
				items.forEach(item => {
					if (Array.isArray(items_by_slashes[number_of_slashes(item.uri)]))
						items_by_slashes[number_of_slashes(item.uri)].push(item);
					else
						items_by_slashes[number_of_slashes(item.uri)] = [item];
				});

				var not_orphans = [];
				not_orphans.push(...items_by_slashes[0]);

				items_by_slashes.forEach((items_on_level, num_slashes) => 
					items_on_level.forEach(item => {
						item.colspan = num_slashes + 1;
						item.colspan_remaining = items_by_slashes.length - item.colspan + 1;
						if (Array.isArray(items_by_slashes[num_slashes+1])) {
							item.children = items_by_slashes[num_slashes+1].filter(subitem => subitem.parent == item.uri);
							//console.log(item.uri, ' children ', item.children.map(i=>i.uri));
							not_orphans.push(...item.children);
						}
						else {
							item.children = [];
						}
					})
				);

				res.render("dashboard/directory", {
					items:items_by_slashes[0],
					orphans:difference(items, not_orphans),
					layout:"dashboard",
				});
			})
	)
	.catch(console.error.bind(console));
});

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
