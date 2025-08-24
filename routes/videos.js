import express from 'express'
import Video   from '../models/video'
import Content from '../models/content'

const router = express.Router()

router.get('/:uri(*)', requestVideo)

async function requestVideo(req, res, next) {
	const video = await Video.findOne( { uri: req.params.uri } )

	if (!video)
		return next()

	video.breadcrumbs = await Content.findBreadcrumbsForURI(video.uri)
	console.log('Video breadcrumbs:', video.breadcrumbs)

	res.render('video-multipart', {
		...video.toObject(),
		title: video.name,
		breadcrumbs: video.breadcrumbs
	})
}

module.exports = router
