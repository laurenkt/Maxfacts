import express from 'express'
import Content from '../models/content'
import Video   from '../models/video'

const router = express.Router()
router.get('/', requestSiteMap)
module.exports = router

async function requestSiteMap(req, res) {
	const all_content = await Content.find().sort('uri').exec()
	const all_videos  = await Video.find().sort('uri').exec()

	let routes = all_content.map(content => ({uri: content.uri, title: content.title}))
	routes = routes.concat(all_videos.map(content => ({uri: content.uri, title: content.title})))

	res.type('xml')
	res.render('sitemap', {layout: false, routes})
}

