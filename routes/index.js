var express = require('express');
var router = express.Router();
var Content = require('../models/content.js');

/* GET home page. */
router.get('/:uri', function(req, res, next) {
	Content.findOne({ uri:req.params.uri}, (err, content) => {
		console.log(content);
		res.render('content', content);

	});
});

module.exports = router;
