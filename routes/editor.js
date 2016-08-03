const router       = require('express').Router();
const Content      = require('../models/content');

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
		item.save(() => res.redirect('/editor/' + item.uri));
	});
});

module.exports = router;
