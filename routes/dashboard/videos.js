import express from "express"
import Video   from "../../models/video"

const router = express.Router()

router.get("/",              requestListPage)
router.get("/new",           requestNewPage)
router.get("/edit/:id(*)",   requestEditPage)
router.get("/delete/:id(*)", requestDeletePage)

router.post("/new",         postNew)
router.post("/edit/:id(*)", postEdit)

async function requestListPage(req, res) {
	const items = await Video.find().sort('uri').exec()

	res.render("dashboard/videos", {items, layout:"dashboard"})
}

function requestNewPage(req, res) {
	res.render("dashboard/videos/edit", {layout:"dashboard"})
}

async function requestEditPage(req, res) {
	const video = await Video.findOne({_id: req.params.id}).exec()
	video.layout = "dashboard"
	res.render("dashboard/videos/edit", video)
}
	
async function requestDeletePage(req, res) {
	// Make sure the user has confirmed deletion
	if (req.query.hasOwnProperty("confirm")) {
		await Video.remove({_id: req.params.id}).exec()
		res.redirect("/dashboard/videos")
	}
	else {
		const video = await Video.findOne( {_id: req.params.id })
		video.layout = "dashboard"
		res.render("dashboard/videos/delete", video)
	}
}

async function updateVideoAndRedirect(video, req, res) {
	video.name   = req.body.name
	video.uri    = req.body.uri
	video.titles = req.body.titles

	// Strip any non-ID URL components if a URL has been pasted
	video.youtube_id = req.body.youtube_id.split(',').map(str => str.replace(/(.*)v=/, '').replace(/&(.*)/, '')).join(',')
	video.filename   = req.body.filename.split(',').map(str => str.replace(/(.*)v=/, '').replace(/&(.*)/, '')).join(',')

	await video.save()
	res.redirect('/dashboard/videos')
}

async function postEdit(req, res) {
	const video = await Video.findOne({ _id: req.params.id })
	updateVideoAndRedirect(video, req, res)
}

async function postNew(req, res) {
	const video = new Video()
	updateVideoAndRedirect(video, req, res)
}

module.exports = router
