import express from "express";
import Image from "../../models/image";
import multer  from "multer";
import recursive from "recursive-readdir";

const router = express.Router();

router.get("/", (req, res) => {
	recursive(process.env.STATIC_FS, function (err, files) {
		res.json(files);
	});
});

router.get("/upload", (req, res) => {
	res.render("dashboard/images/upload", {layout:"dashboard"});
});

router.get("/edit/:id(*)", (req, res) => {
	Image.findOne( { _id: req.params.id } ).then(image => {
		res.render("dashboard/images/upload", {uri:image.uri, layout:"dashboard"});
	});
});

router.get("/delete/:id(*)", (req, res) => {
	// Make sure the user has confirmed deletion
	if (req.query.hasOwnProperty("confirm")) {
		Image
			.remove({_id: req.params.id})
			.exec()
			.then(() => res.redirect("/dashboard/images"));
	}
	else {
		Image.findOne( {_id: req.params.id }).then(image => {
			res.render("dashboard/images/delete", {uri:image.uri, layout:"dashboard"});
		});
	}
});


router.post("/edit/:id(*)", multer({storage:multer.memoryStorage()}).single("image"), (req, res) => {
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

		image.save(_ => res.redirect("/dashboard/images"));
	});
});

router.post("/upload", multer({storage:multer.memoryStorage()}).single("image"), (req, res) => {
	if (req.file) {
		var image = new Image(req.file);

		// Guess a URI if there isn"t one
		if (!req.body.uri)
			image.uri = req.file.originalname;
		else
			image.uri = req.body.uri;

		image.save(_ => res.redirect("/dashboard/images"));
	}
});

module.exports = router;
