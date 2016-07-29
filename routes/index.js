var express = require('express');
var router = express.Router();
var Content = require('../models/content.js');

/* GET home page. */
router.get('/', (req, res, next) => {
	Content.find({}, {}, { sort: { title: 1 } }, (err, items) => {
		res.render('index', {items: items});
	});
});

router.get('/:uri(*)', (req, res, next) => {
	Content.findOne( { uri: req.params.uri } ).then(content => {
		if (!content)
			next();

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
