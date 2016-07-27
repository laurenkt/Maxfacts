var express = require('express');
var router = express.Router();
var Content = require('../models/content.js');

/* GET home page. */
router.get('/:uri(*)', function(req, res, next) {
	console.log('Searching for content at ' + req.params.uri);
	Content.findOne( { uri: req.params.uri } ).then(content => {
		if (content)
			res.render('content', content);
		else
			next();
	});
});

module.exports = router;
