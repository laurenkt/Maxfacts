import express      from "express";
import Content      from "../models/content";
import hbs          from "hbs";
import sanitizeHtml from "sanitize-html";

const router = express.Router();

// TODO: Move this into a separate handler
hbs.registerHelper("shift_headers", function (offset, text) {
	const headers = ["h1", "h2", "h3", "h4", "h5", "h6"];
	let transform = {};

	for (let i = 0; i < 6; i++) {
		// Don"t go off the edge of the array
		transform[headers[i]] = headers[Math.min(i + offset, 5)];
	}

	// Allow everything - it is not the job of this helper to sanitize
	// inputs
	return sanitizeHtml(text, {
		allowedTags:       false,
		allowedAttributes: false,
		transformTags:     transform,
	});
});

// Landing page
router.get("/", (req, res) => {
	// The three pillars of the home-page
	Promise.all([
		Content.findFromParentURI("diagnosis").sort("title").exec(),
		Content.findFromParentURI("treatment").sort("title").exec(),
		Content.findFromParentURI("help").sort("title").exec(),
	])
	.then(([diagnosis, treatment, help]) => {
		// Use alternative layout
		res.render("index", {diagnosis, treatment, help, layout:"layout-fill"});
	});
});

// Directory handler
router.get("/:uri(*)", (req, res, next) => {
	Content.findOne( { uri: req.params.uri } )
		.then(content => {
			if (!content || content.type != "directory")
				return next();
			
			Promise
				.all(
					content.lineage
					// Get links from all parent stages
						.map(uri => Content
							.findFromAdjacentURI(uri)
							.select("title has_sublist surtitle description type uri")
							.sort("title")
							.exec()
						)
					// Get siblings of the current page
						.concat([Content.findFromAdjacentURI(content.uri).select("title has_sublist surtitle description type uri").sort("title").exec()])
					// Get children of the current page
						.concat([Content.findFromParentURI(content.uri).select("title has_sublist surtitle description type uri").sort("title").exec()])
					// Also get breadcrumbs
						.concat([Content.findFromURIs(content.lineage).select("title uri").sort("uri").exec()])
				)
				.then(directory => new Promise((resolve, reject) => {
					// Transform directory, adding sublists as necessary
					// TODO: this is really a promise mess - there must be a clearer way to structure this
					// Essentially return a composed promise of all columns, for each column return a composed promise
					// of creating a sublist entry for each item which has a sublist (this must be a promise as it hits
					// the DB)
					Promise.all(
						directory.map(column => Promise.all(column
								.filter(c => c.has_sublist)
								.map(c => Content
									.findFromParentURI(c.uri)
									.select("title description type uri")
									.sort("title")
									.exec()
									.then(sublist => c.sublist = sublist)
								)
							)
						)
					)
						.then(() => resolve(directory))
						.catch(reject);
				}))
				.then(directory => {
					content.breadcrumbs = directory.pop(); // The breadcrumb lineage will be the last item

					// If this page has a sublist, don't display children (they will be displayed in the parent list)
					if (content.has_sublist)
						directory.pop();

					content.directory = directory.filter(list => list.length > 0); // The rest are the directory (assuming they have at least 1 item)

					// Make sure first level is always in a certain order (Diagnosis, Treatment, Help)
					// TODO: This is a bit hacky so maybe there should be another solution
					if (content.directory[0][1].uri === "help") {
						// Swap with treatment
						const tmp = content.directory[0][1];
						content.directory[0][1] = content.directory[0][2];
						content.directory[0][2] = tmp;
					}

					// Provide a way for the template to lookup whether a URI is selected
					content.selected = {};
					content.lineage.forEach(uri => content.selected[uri] = "selected");
					// The current page too
					content.selected[content.uri] = "selected";

					// Pass on how many levels there are in this branch
					// TODO: is this being used for anything?
					// And how deep we are into the branch
					content.classes = `directory-browser levels-${content.directory.length} deepness-${content.lineage.length}`;

					// Editor URI
					content.edit_uri = "/dashboard/directory/" + content.uri;

					res.render("directory", content);
				})
				.catch(console.error.bind(console));

		}).catch(console.error.bind(console));
});

// Page handler
router.get("/:uri(*)", (req, res, next) => {
	Content.findOne( { uri: req.params.uri } )
		.then(content => {
			if (!content)
				next();

			else
				return Promise.all([
					content.getInvalidLinks(),
					Content.findFromURIs(content.lineage)
						.select("title uri")
						.sort("uri")
						.exec(),
					(content.type == "level1" ? Content.findFromParentURI(content.uri) : Content.findFromParentURI(content.parent))
						.select("title surtitle uri")
					// For level1, 'next' is level2, otherwise it's level3
						.where("type", content.type == "level1" ? "level2" : "level3")
						.exec(),
				])
				.then(([uris, breadcrumbs, next_page]) => {
					content.invalid_uris = uris;
					content.breadcrumbs  = breadcrumbs;
					
					// Pass which document comes 'next' to the template
					if (next_page[0])
						content.next = next_page[0];

					// Editor URI
					content.edit_uri = "/dashboard/directory/" + content.uri;

					// Standard template for layout
					let template = "content";

					// Some content types have customer renderers.. at the moment we will whitelist these in particular
					if ((["level3", "level2", "level1"]).includes(content.type))
						template = content.type;

					res.render(template, content);
				});
		})
		.catch(console.error.bind(console));
});

module.exports = router;
