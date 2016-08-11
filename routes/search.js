import express from 'express';
import Content from '../models/content';

const router = express.Router();

router.get('/', (req, res, next) => {
	Content
		.find(
			{ $text : { $search : req.query.query } }, 
			{ score : { $meta: "textScore" } }
		)
		.sort({ score : { $meta : 'textScore' } })
		.exec()
		.then(results => {
			res.render('search', {results});
		})
		.catch(console.error.bind(console));
});

module.exports = router;
