var express = require('express');
var router = express.Router();
var Content = require('../models/content.js');
const hbs = require('hbs');
const sanitizeHtml = require('sanitize-html');

/* GET home page. */
router.get('/', (req, res, next) => {
	Content.find({}, {}, { sort: { title: 1 } }, (err, items) => {
		res.render('index', {items: items});
	});
});

router.get('/:uri(*)', (req, res, next) => {
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

	Content.findOne( { uri: req.params.uri } ).then(content => {
		if (!content)
			next();

		content.validateLinks();

		Content
			.find()
			.where('uri').in(content.lineage)
			.select('title uri')
			.sort('uri')
			.exec((err, results) => {
				content.breadcrumbs = results;
				res.render('content', content);
			});
	});
});

module.exports = router;
