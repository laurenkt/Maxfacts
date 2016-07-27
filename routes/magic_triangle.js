var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
	res.render('magic_triangle_preamble');
});

router.get('/tool', function(req, res, next) {
	res.render('magic_triangle');
});

module.exports = router;
