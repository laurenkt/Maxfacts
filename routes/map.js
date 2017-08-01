import express from 'express'
import Content from '../models/content'
import Video   from '../models/video'
import Recipe  from '../models/recipe'
import {maxBy} from 'lodash'

const router = express.Router()
router.get('/', requestSiteMap)
module.exports = router

function dateToLastmod(date) {
	return '' +
		date.getUTCFullYear() + '-' + 
		date.getUTCMonth().toString().padStart(2, '0')   + '-' +
		date.getUTCDate().toString().padStart(2, '0')    + 'T' +
		date.getUTCHours().toString().padStart(2, '0')   + ':' + 
		date.getUTCMinutes().toString().padStart(2, '0') + '+00:00'
}

async function requestSiteMap(req, res) {
	let   all_content = await Content.find().sort('uri').exec()
	const all_videos  = await Video.find().sort('uri').exec()
	const all_recipes = await Recipe.find().sort('uri').exec()

	// Remove blank pages
	all_content = all_content.filter(c => c.body)

	// Put full URI on recipes and extract timestamp if one does not exist
	all_recipes.forEach(r => {
		r.uri = 'help/oral-food/recipes/' + r.id

		if (!r.updatedAt)
			r.updatedAt = r._id.getTimestamp()
	})

	const content_mapper = content => ({
		uri:        content.uri,
		title:      content.title,
		lastmod:    dateToLastmod(content.updatedAt),
		priority:   content.uri.split('/').length,
		changefreq: 'weekly',
	})

	let routes = all_content.map(content_mapper)
	routes = routes.concat(all_videos.map(content_mapper))
	routes = routes.concat(all_recipes.map(content_mapper))

	// Normalize the priorities and make sure highest priority is lowest number
	// (currently it is the other way round)
	const lowest_priority = maxBy(routes, r => r.priority).priority
	routes.forEach(r => {
		r.priority = Math.round((1.0 - (((r.priority/lowest_priority) * 0.9) + 0.1))*100) / 100
	})

	// Add homepage
	routes.push({
		uri:        '',
		title:      'Maxfacts',
		lastmod:    dateToLastmod(new Date()),
		priority:   1,
		changefreq: 'weekly'
	})

	res.type('xml')
	res.render('sitemap', {layout: false, routes})
}

