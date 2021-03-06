import React from "react"
import {Html} from "slate"
import {html as html_beautify} from "js-beautify"
import html_clean from "htmlclean"

const BLOCK_TAGS = {
	p:  "paragraph",
	li: "list-item",
	caption: "caption",
	ul: "list",
	ol: "num-list",
	h1: "heading-1",
	h2: "heading-2",
	h3: "heading-3",
	h4: "heading-4",
	h5: "heading-5",
	h6: "heading-6",
	img: "img",
	br: "br",
	hr: "hr",
	tr: "tr",
	td: "td",
	th: "th",
	tbody: "tbody",
	table: "table",
	aside: "aside",
	video: "video",
}

// Add a dictionary of mark tags.
const MARK_TAGS = {
	strong: "bold",
	em:     "emphasis",
	i:      "italic",
	sub:    "sub",
	sup:    "sup",
}

const colspan = data => {
	if (data.get("attribs").colspan)
		return {colSpan: data.get("attribs").colspan}

	return {}
}

const rules = [
	{
		deserialize(el, _) {
			// Skip certain tags
			switch (el.tagName) {
				case "HEAD":
				case "STYLE":
					return []
				case "O:P":
					// Strip empty paragraphs
					if (el.childNodes.length == 0 || el.childNodes.every(child => child.type == "text" && child.data.match(/^\s*$/) != null))
						return []
			}
			return
		},
	},
	{
		deserialize(el, _) {
			if (el.tagName != "BR") return

			return {
				kind: "text",
				text: "\n",
			}
		},
		serialize(obj, children) {
			if (obj.type !== 'text') return
			if (children !== '\n') return

			return (
				<br />
			)
		}
	},
	{
		deserialize(el, _) {
			if (el.tagName != "HR") return

			return {
				kind: "block",
				type: "hr",
				isVoid: true,
				nodes: [],
			}
		}
	},
	{
		serialize(obj, children) {
			if (obj.kind != "inline") return
			
			if (obj.type == "link") {
				const href      = obj.data.get("href")
				const className = obj.data.get("class")

				return <a href={href} className={className}>{children}</a>
			}
		},
	},
	{
		deserialize(el, next) {
			const block = BLOCK_TAGS[el.tagName.toLowerCase()]
			if (!block) return

			const nodes = next(el.childNodes)

			if (nodes.length == 0 || nodes.every(node => node.kind == "text" && node.text.match(/^\s*$/)))
				return []

			let attribs = {}

			//console.log('el.attributes', el.attributes)
			for (let i = 0; i < el.attributes.length; i++) {
				attribs[el.attributes[i].name] = el.attributes[i].value
			}
			//console.log('attribs', attribs)

			return {
				kind: "block",
				type: block,
				nodes,
				data: {attribs: attribs},
			}
		},
		serialize(obj, children) {
			if (obj.kind != "block") return

			// Special transform for headings
			if (obj.type.slice(0, 8) == "heading-") {
				const heading_number = Number(obj.type[8])
				switch (heading_number) {
					case 1: return <h1>{children}</h1>
					case 2: return <h2>{children}</h2>
					case 3: return <h3>{children}</h3>
					case 4: return <h4>{children}</h4>
					case 5: return <h5>{children}</h5>
					case 6: return <h6>{children}</h6>
				}
			}

			switch (obj.type) {
				case "paragraph": return <p>{children}</p>
				case "list":      return <ul>{children}</ul>
				case "caption":   return <caption>{children}</caption>
				case "list-item": return <li>{children}</li>
				case "num-list":  return <ol>{children}</ol>
				case "hr":        return <hr />
				case "tr":        return <tr {...colspan(obj.data)}>{children}</tr>
				case "td":        return <td {...colspan(obj.data)}>{children}</td>
				case "th":        return <th {...colspan(obj.data)}>{children}</th>
				case "aside":     return <aside>{children}</aside>
				case "video":
					console.log('Video element serialize', obj)
					return <video controls="controls">
						<source src={obj.data.get('src')} type="video/mp4" />
						This browser not capable of playing embedded video.
					</video>;
				case "img":
					return <img src={obj.data.get('src')} height={obj.data.get('height')} width={obj.data.get('width')} />
				case "figure":
					const src = obj.data.get("src")

					return (
						<figure>
							{(src.match(/\.mp4$/i) &&
								<video controls="controls">
									<source src={src} type="video/mp4" />
									This browser not capable of playing embedded video.
								</video>) ||
								<img src={src} />}
							<figcaption>{children}</figcaption>
						</figure>
					)
				case "table": return <table>{children}</table>
				case "tbody": return <tbody>{children}</tbody>
			}
		}
	},
	{
		deserialize(el, next) {
			let tagName = el.tagName
			// For MSWord which uses <b> not <strong>
			if (tagName == "B") tagName = "STRONG"

			const mark = MARK_TAGS[tagName.toLowerCase()]
			if (!mark) return
			return {
				kind: "mark",
				type: mark,
				nodes: next(el.childNodes)
			}
		},
		serialize(obj, children) {
			if (obj.kind != "mark") return

			switch (obj.type) {
				case "bold":       return <strong>{children}</strong>
				case "emphasis":   return <em>{children}</em>
				case "italic":     return <i>{children}</i>
				case "underlined": return <u>{children}</u>
				case "sub":        return <sub>{children}</sub>
				case "sup":        return <sup>{children}</sup>
			}
		},
	},
	{
		// Special case for figures
		deserialize(el, next) {
			if (el.tagName != "FIGURE") return

			console.log('Deserialize figure', el);

			// Find img
			const img = Array.prototype.find.call(el.childNodes, child => child.tagName == "IMG")
			const video = Array.prototype.find.call(el.childNodes, child => child.tagName == "VIDEO")

			const src = img ? img.attributes.getNamedItem('src').value :
				video ? video.childNodes[0].attributes.getNamedItem('src').value :
				'';

			// Find caption
			const caption = Array.prototype.find.call(el.childNodes, child => child.tagName == "FIGCAPTION")

			return {
				kind: "block",
				type: "figure",
				nodes: next(caption.childNodes),
				data: {
					src,
				},
			}
		}
	},
	{
		deserialize(el, _) {
			if (el.tagName != "IMG" && el.tagName != "VIDEO") return

			console.log('Found video', el);

			const empty = {value: undefined}

			return {
				kind: "block",
				type: el.tagName.toLowerCase(),
				isVoid: true,
				data: {
					src:    el.attributes.getNamedItem('src').value,
					width:  (el.attributes.getNamedItem('width')  || empty).value,
					height: (el.attributes.getNamedItem('height') || empty).value,
					controls: (el.attributes.getNamedItem('controls') || empty).value,
				},
			}
		}
	},
	{
		// Special case for links, to grab their href.
		deserialize(el, next) {
			if (el.tagName != "A") return

			if (el.attributes.getNamedItem('href')) {
				return {
					kind:   "inline",
					type:   "link",
					nodes:  next(el.childNodes),
					data: {
						href: el.attributes.getNamedItem('href').value,
						class: el.attributes.getNamedItem('class') ? el.attributes.getNamedItem('class').value : undefined,
					},
				}
			}
		}
	}
]

const html_serializer = new Html({rules})

export function serialize(state) {
	// Beautify the output because Slate just produces a single line HTML mess which would
	// be very hard for the user to edit
	return html_beautify(
		html_serializer.serialize(state),
		{
			indent_size: 4,
			wrap_line_length: 60,
		}
	)
}

export function deserialize(html_string) {
	// Minify the HTML first to make it as easy as possible to normalize (strips irrelevant whitespace)
	// Then slate can do its magic
	// Note that Slate refusing to handle whitespace in HTML is a recognised
	// limitation that they have decided not to alter due to other concerns
	// See: https://github.com/ianstormtaylor/slate/issues/407
	console.log('html_clean', html_clean(html_string))
	return html_serializer.deserialize(
		html_clean(html_string)
	)
}
