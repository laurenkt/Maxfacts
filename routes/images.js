import express from 'express'
import Image   from '../models/image'
import Content from '../models/content'

const router = express.Router()

router.get('/:uri(*)', requestImage)

async function requestImage(req, res, next) {
	const image = await Image.findOne( { uri: req.params.uri } )
		
	if (!image)
		return next()

	res.set('Content-Type', image.mimetype)
	res.set('last-modified', image.updatedAt)
	res.set('etag', Content.etagFromBuffer(
		image.buffer,
		image.updatedAt.getTime()
	))
	res.send(image.buffer)
}

module.exports = router
