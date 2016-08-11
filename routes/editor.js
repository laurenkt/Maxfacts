const router       = require('express').Router();
const Content      = require('../models/content');
/*
 *
		const hasBody = this.body && this.body.length != '';

		if (this.type == 'page')
			return hasBody;

		else (this.type == 'directory') {
			// It must have either a body or children
			return hasBody || ContentSchema.statics.findFromParentURI(this.uri).
		}
		*/
router.get('/', (req, res, next) => {
	const hasBody = item => item.body && item.body != '';

	Content.find().sort('title').exec().then(items => 
		Promise
			.all(
				items.map(item =>
					Promise.all([
						item.getInvalidLinks().then(uris => uris.length),
						hasBody(item) ?
							Promise.resolve(false) :
							item.type == 'directory' ?
								Content.findFromParentURI(item.uri).exec().then(children => children.length == 0) :
								Promise.resolve(true),
					])
					.then(([length, is_empty]) => {
						item.is_empty = is_empty
						item.invalid_links_count = length;
					})
				)
			)
			.then(() => {
				const number_of_slashes = s => (s.match(/\//g) || []).length;
				var orphans = [];
				var structure = {};
				structure['/'] = items.filter(item => number_of_slashes(item.uri) == 0);
				items = items.filter(item => !structure['/'].includes(item));

				structure['/'].forEach(item => {
					structure[item.uri] = items.filter(subitem => subitem.parent == item.uri);
					items = items.filter(subitem => subitem.parent != item.uri);

					structure[item.uri].forEach(item => {
						structure[item.uri] = items.filter(subitem => subitem.parent == item.uri);
						items = items.filter(subitem => subitem.parent != item.uri);

						structure[item.uri].forEach(item => {
							structure[item.uri] = items.filter(subitem => subitem.parent == item.uri);
							items = items.filter(subitem => subitem.parent != item.uri);

							structure[item.uri].forEach(item => {
								structure[item.uri] = items.filter(subitem => subitem.parent == item.uri);
								items = items.filter(subitem => subitem.parent != item.uri);
							});
						});
					});
				});

				res.render('directory', {structure, orphans:items})
			})
	)
	.catch(console.error.bind(console));
});

router.get('/delete/:uri(*)', (req, res, next) => {
	if (req.query.hasOwnProperty('confirm')) {
		Content.remove({uri: req.params.uri}).exec().then(() => res.redirect('/editor'));
	}
	else {
		throw new Error('Deletion must contain confirm token in URL query string');
	}
});

router.get('/create', (req, res, next) => {
	res.render('editor');
});

router.post('/create', (req, res, next) => {
	var content = new Content(req.body);
	content.save(() => res.redirect(`/editor/${req.body.uri}?saved`));
});

router.get('/:uri(*)', (req, res, next) => {
	Content.findOne( { uri: req.params.uri } ).exec().then(content => {
		if (content) {
			content.saved = req.query.hasOwnProperty('saved');
			content.selected = {};
			content.selected[content.type || 'page'] = 'selected';
			res.render('editor', content);
		}
		else
			next();
	})
	.catch(console.error.bind(console));
});

router.post('/:uri(*)', (req, res, next) => {
	Content.findOne({uri: req.params.uri}).exec().then(item => {
		item.uri = req.body.uri;
		item.title = req.body.title;
		item.type = req.body.type;
		item.body = req.body.body;
		item.save(() => res.redirect(`/editor/${item.uri}?saved`));
	})
	.catch(console.error.bind(console));
});

module.exports = router;
