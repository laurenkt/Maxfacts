import express from 'express'
import Content from '../models/content'
import Video   from '../models/video'
import Recipe  from '../models/recipe'
import {maxBy, groupBy, values} from 'lodash'
import * as fs from "fs";
import fetch from 'node-fetch'

const router = express.Router()
router.get('/',    requestDumpContent)
module.exports = router

function dateToLastmod(date) {
    return '' +
        date.getUTCFullYear() + '-' +
        date.getUTCMonth().toString().padStart(2, '0')   + '-' +
        date.getUTCDate().toString().padStart(2, '0')    + 'T' +
        date.getUTCHours().toString().padStart(2, '0')   + ':' +
        date.getUTCMinutes().toString().padStart(2, '0') + '+00:00'
}

async function publish(uri, data) {
    const dir = `/output/dump/${uri}`
    const path = `/output/dump/${uri}/index.html`

    await fs.promises.mkdir(dir, {recursive: true})
    await fs.promises.writeFile(path, data)
}

async function requestDumpContent(req, res) {
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

    res.type('text')

    for (const route of routes) {
        process.stderr.write(`Dumping ${route.uri}\n`)
        res.write(`Dumping ${route.uri}\n`)
        const data = await fetch(`http://0.0.0.0:3000/${route.uri}`)
        const text = await data.text()
        await publish(route.uri, text)
    }

    res.end()
}

