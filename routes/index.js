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

router.get('/directory', (req, res, next) => {
	Content.find().sort('title').then(items => {
		Promise.all(items.map(item => item.getInvalidLinks().then(uris => item.invalid_links_count = uris.length)))
			.then(() => res.render('directory', {items: items}));
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
						.map(uri => Content
							.findFromAdjacentURI(uri)
							.select('title uri')
							.exec()
						)
						.concat([Content.findFromAdjacentURI(content.uri).select('title uri').exec()])
				)
				.then(directory => {
					content.directory = directory;
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
					res.render('content', content);
				});
		})
		.catch(console.error.bind(console));
});

module.exports = router;
