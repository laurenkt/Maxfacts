const router       = require('express').Router();
const Content      = require('../models/content');

router.get('/', (req, res, next) => {
	Content.find().sort('title').then(items => {
		Promise
			.all(
				items.map(
					item => item.getInvalidLinks()
						.then(uris => item.invalid_links_count = uris.length)
				)
			)
			.then(() => {
				const number_of_slashes = s => (s.match(/\//g) || []).length;
				var orphans = [];
				var structure = {};
				structure['/'] = items.filter(item => number_of_slashes(item.uri) == 0);
				items = items.filter(item => !structure['/'].includes(item));

				console.log(structure);

				res.render('directory', {items: items})
			});
	});
});

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
