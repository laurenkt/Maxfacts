import express from 'express'
import Image from '../models/image'

const router = express.Router()

router.get('/:uri(*)', requestImage)

async function requestImage(req, res, next) {
	const image = await Image.findOne( { uri: req.params.uri } )
		
	if (!image)
		return next()

	res.set('Content-Type', image.mimetype)
	res.send(image.buffer)
}

module.exports = router
