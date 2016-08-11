var express = require('express');
var router = express.Router();
var Content = require('../models/content.js');
const hbs = require('hbs');
const sanitizeHtml = require('sanitize-html');

hbs.registerHelper('shift_headers', function (offset, text) {
	var headers = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
	var transform = {};

	for (var i = 0; i < 6; i++) {
		// Don't go off the edge of the array
		transform[headers[i]] = headers[Math.min(i + offset, 5)];
	}

	// Allow everything - it is not the job of this helper to sanitize
	// inputs
	return sanitizeHtml(text, {
		allowedTags:       false,
		allowedAttributes: false,
		transformTags:     transform
	});
});

/* GET home page. */
router.get('/', (req, res, next) => {
	Promise.all([
		Content.findFromParentURI('diagnosis').exec(),
		Content.findFromParentURI('treatment').exec(),
		Content.findFromParentURI('help').exec(),
	])
	.then(([diagnosis, treatment, help]) => {
		res.render('index', {diagnosis, treatment, help, layout:'layout-fill'});
	});
});

// Directory handler
router.get('/:uri(*)', (req, res, next) => {	
	Content.findOne( { uri: req.params.uri } )
		.then(content => {
			if (!content || content.type != 'directory')
				return next();
			
			Promise
				.all(
					content.lineage
					// Get links from all parent stages
						.map(uri => Content
							.findFromAdjacentURI(uri)
							.select('title type uri')
							.exec()
						)
					// Get siblings of the current page
						.concat([Content.findFromAdjacentURI(content.uri).select('title type uri').exec()])
					// Get children of the current page
						.concat([Content.findFromParentURI(content.uri).select('title type uri').exec()])
					// Also get breadcrumbs
						.concat([Content.findFromURIs(content.lineage).select('title uri').sort('uri').exec()])
				)
				.then(directory => {
					content.breadcrumbs = directory.pop(); // The breadcrumb lineage will be the last item

					// Don't display children if there is content
					if (content.body && content.body != '')
						directory.pop();

					content.directory = directory;

					// Provide a way for the template to lookup whether a URI is selected
					content.selected = {};
					content.lineage.forEach(uri => content.selected[uri] = 'selected');
					// The current page too
					content.selected[content.uri] = 'selected';

					// Level count
					content.levels = directory.length;
					// Editor URI
					content.edit_uri = '/editor/' + content.uri;

					res.render('list', content);
				})
				.catch(console.error.bind(console));

		}).catch(console.error.bind(console));
});

// Page handler
router.get('/:uri(*)', (req, res, next) => {
	Content.findOne( { uri: req.params.uri } )
		.then(content => {
			if (!content)
				next();

			else
				return Promise.all([
					content.getInvalidLinks(),
					Content.findFromURIs(content.lineage)
						.select('title uri')
						.sort('uri')
						.exec()
				])
				.then(([uris, breadcrumbs]) => {
					content.invalid_uris = uris;
					content.breadcrumbs  = breadcrumbs;
					// Editor URI
					content.edit_uri = '/editor/' + content.uri;
					res.render('content', content);
				});
		})
		.catch(console.error.bind(console));
});

module.exports = router;
