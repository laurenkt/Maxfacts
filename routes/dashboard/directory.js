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

				var not_orphans = items_by_slashes[0];

				items_by_slashes.forEach((items_on_level, num_slashes) =>
					items_on_level.forEach(item => {
						item.colspan = num_slashes + 1;
						item.colspan_remaining = items_by_slashes.length - item.colspan;
						if (Array.isArray(items_by_slashes[num_slashes+1])) {
							//console.log(items_by_slashes[num_slashes+1].map(i => `${i.parent} ?? ${item.uri}`));
							item.children = items_by_slashes[num_slashes+1].filter(subitem => subitem.parent == item.uri);
							//console.log(item.children);
							not_orphans.push(...item.children);
						}
						else {
							item.children = [];
						}
					})
				);

				res.render("dashboard/directory", {
					items:not_orphans,
					orphans:difference(items, not_orphans),
					layout:"layout-dashboard",
				});
			})
	)
	.catch(console.error.bind(console));
});

router.get("/delete/:uri(*)", (req, res) => {
	if (req.query.hasOwnProperty("confirm")) {
		Content.remove({uri: req.params.uri}).exec().then(() => res.redirect("/editor"));
	}
	else {
		throw new Error("Deletion must contain confirm token in URL query string");
	}
});

router.get("/create", (req, res) => {
	res.render("editor");
});

router.post("/create", (req, res) => {
	var content = new Content(req.body);
	content.save(() => res.redirect(`/editor/${req.body.uri}?saved`));
});

router.get("/:uri(*)", (req, res, next) => {
	Content.findOne( { uri: req.params.uri } ).exec().then(content => {
		if (content) {
			content.saved = req.query.hasOwnProperty("saved");
			content.selected = {};
			content.selected[content.type || "page"] = "selected";
			res.render("editor", content);
		}
		else
			next();
	})
	.catch(console.error.bind(console));
});

router.post("/:uri(*)", (req, res) => {
	Content.findOne({uri: req.params.uri}).exec().then(item => {
		item.uri = req.body.uri;
		item.title = req.body.title;
		item.type = req.body.type;
		item.body = req.body.body;
		item.save(() => res.redirect(`/editor/${item.uri}?saved`));
	})
	.catch(console.error.bind(console));
});

module.exports = router;
