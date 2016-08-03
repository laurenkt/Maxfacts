import express from 'express';
import Image from '../models/image';
import multer  from 'multer';

const router = express.Router();

router.get('/images', (req, res, next) => {
	Image.find({}, {}, { sort: { uri: 1 } }, (err, items) => {
		res.render('images', {items: items});
	});
});

router.get('/images/upload', (req, res, next) => {
	res.render('image_upload_form');
});

router.get('/images/edit/:id(*)', (req, res, next) => {
	Image.findOne( { _id: req.params.id } ).then(image => {
		res.render('image_upload_form', image);
	});
});

router.post('/images/edit/:id(*)', multer({stroage:multer.memoryStorage()}).single('image'), (req, res, next) => {
	Image.findOne( { _id: req.params.id } ).then(image => {
		// Edit URI
		image.uri = req.body.uri;

		// Change the file?
		if (req.file) {
			image.buffer = req.file.buffer;
			image.originalname = req.file.originalname;
			image.mimetype = req.file.mimetype;
			image.encoding = req.file.encoding;
			image.size = req.file.size;
		}

		image.save(err => res.redirect('/images'));
	});
});

router.get('/:uri(*)', (req, res, next) => {
	Image.findOne( { uri: req.params.uri } ).then(image => {
		if (image) {
			res.set('Content-Type', image.mimetype);
			res.send(image.buffer);
		}
		else
			next();
	});
});

router.post('/images/upload', multer({storage:multer.memoryStorage()}).single('image'), (req, res, next) => {
	if (req.file) {
		var image = new Image(req.file);

		// Guess a URI if there isn't one
		if (!req.body.uri)
			image.uri = req.file.originalname;
		else
			image.uri = req.body.uri;

		image.save(err => res.redirect('/images'));
	}
});

module.exports = router;
