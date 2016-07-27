var express = require('express');
var router = express.Router();
var Content = require('../models/content.js');

router.get('/create', (req, res, next) => {
	res.render('editor');
});

router.post('/create', (req, res, next) => {
	var content = new Content(req.body);
	content.save(() => res.redirect('/' + req.body.uri));
});

router.get('/:uri(*)', (req, res, next) => {
	Content.findOne( { uri: req.params.uri } ).then(content => {
		if (content)
			res.render('editor', content);
		else
			next();
	});
});

router.post('/:uri(*)', (req, res, next) => {
	Content.findOne({uri: req.params.uri}).then(item => {
		item.uri = req.body.uri;
		item.title = req.body.title;
		item.body = req.body.body;
		item.save(() => res.redirect('/' + req.body.uri));
	});
});

module.exports = router;
