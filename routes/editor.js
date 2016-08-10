const router       = require('express').Router();
const Content      = require('../models/content');

router.get('/create', (req, res, next) => {
	res.render('editor');
});

router.post('/create', (req, res, next) => {
	var content = new Content(req.body);
	content.save(() => res.redirect(`/editor/${req.body.uri}?saved`));
});

router.get('/:uri(*)', (req, res, next) => {
	Content.findOne( { uri: req.params.uri } ).then(content => {
		if (content) {
			var context = {
				uri: content.uri,
				body: content.body,
				title: content.title,
				selected: {},
				saved: req.query.hasOwnProperty('saved') ? true : false,
			}
			console.log(req.query);
			context.selected[content.type || 'page'] = 'selected';
			res.render('editor', context);
		}
		else
			next();
	});
});

router.post('/:uri(*)', (req, res, next) => {
	Content.findOne({uri: req.params.uri}).then(item => {
		item.uri = req.body.uri;
		item.title = req.body.title;
		item.type = req.body.type;
		item.body = req.body.body;
		item.save(() => res.redirect(`/editor/${item.uri}?saved`));
	});
});

module.exports = router;
