var express = require('express');
var router = express.Router();
var Content = require('../models/content.js');

router.get('/:uri(*)', function(req, res, next) {
	Content.findOne( { uri: req.params.uri } ).then(content => {
		if (content)
			res.render('editor', content);
		else
			next();
	});
});

router.post('/:uri(*)', function(req, res, next) {
	Content.findOne({uri: req.params.uri}, (err, item) => {
		item.uri = req.body.uri;
		item.title = req.body.title;
		item.body = req.body.body;
		item.save(() => res.redirect('/' + req.body.uri));
	});
});

module.exports = router;
