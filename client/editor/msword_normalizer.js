// @flow
import {Parser,
	DomHandler} from "htmlparser2"
import DomUtils from "domutils"
import sanitizeHtml from "sanitize-html"
import {merge} from "lodash"

function multiplePassProcess(input:string, fn:any) {
	let temp = ""

	while (temp != input) {
		temp = input
		input = fn(input)
	}

	return input
}

function processTagWithFn(html:string, tag_name, fn, filter):string {
	let handler = new DomHandler((err, dom) => {
		let elements:Array<any> = DomUtils.getElements({tag_name}, dom, true)

		if (filter)
			elements = elements.filter(filter)

		elements.forEach((el, idx) => fn(el, idx, elements))
		html = DomUtils.getOuterHTML(dom, {decodeEntities:true})
	})
	let parser = new Parser(handler, {decodeEntities:true})
	parser.write(html)
	parser.done()
	return html
}

export function processTables(html:string):string {
	/**
	 * 	<table>
	 * 		<tr>
	 * 			<td>
	 *  			<p><b>[HEADING]</b></p>
	 *  		</td>
	 *  	</tr>
	 *  	<tr>
	 *  		<td>
	 *  			<p>[CELL]</p>
	 *  		</td>
	 *  	</tr>
	 *  </table>
	 */
	/**
	 * 	<table>
	 * 		<tr>
	 * 			<th>[HEADING]</th>
	 * 		</tr>
	 * 		<tr>
	 * 			<td>[CELL]</td>
	 * 		</tr>
	 * 	</table>
	 */

	const is_p = node =>
		node != null &&
		node.type == "tag" &&
		node.name == "p"

	const is_b = node =>
		node != null &&
		node.type == "tag" &&
		node.name == "b"

	// First process cells
	html = processTagWithFn(html, "td", node => {
		DomUtils.findAll(is_p, node.children).forEach(child => {
			child.name = "span"
			child.attribs = {}

			// Walk down descendents until we find a single b
			let next = child
			while(next.children && next.children.length == 1) {
				if (is_b(next.children[0])) {
					node.name = "th"
					next.children = next.children[0].children
					next.children.forEach(child2 => child2.parent = next)
					break
				}
				
				next = next.children[0]
			}
		})
	})

	const is_tr = node =>
		node != null &&
		node.type == "tag" &&
		node.name == "tr"

	// Then insert any captions/restructure tables as necessary
	return processTagWithFn(html, "table", table => {
		// Walk backwards until a table caption is found
		let prev = table.prev

		while (prev != null) {
			const prev_text = DomUtils.getText(prev)

			if (prev_text.match(/^Table\s*([0-9]+):/mi)) {
				// Found it
				DomUtils.prepend(
					table.children[0],
					{
						...prev,
						type: "tag",
						name: "caption",
					}
				)
				prev.type = "text"
				prev.data = ""
			}
			else if (prev_text.match(/^(\s|&nbsp;)*$/m)) {
				prev = prev.prev
				continue
			}

			break
		}

		// Now make sure the table has a <tbody>
		const rows = table.children.filter(is_tr)
		if (rows.length > 0) {
			// Generate tbody
			const tbody = {
				type: "tag",
				name: "tbody",
				children: [],
				parent: table,
			}

			rows.forEach(DomUtils.removeElement)
			rows.forEach(row => DomUtils.appendChild(tbody, row))
			DomUtils.appendChild(table, tbody)
		}
	})
}

export function processAsides(html:string):string {
	const is_green_span = node =>
		node != null &&
		node.type == "tag" &&
		node.name == "span" &&
		node.attribs &&
		node.attribs.style && 
		node.attribs.style.match(/color:(\s*)#00B050/)

	return processTagWithFn(html, "p", node => {
		const green_span = DomUtils.findOne(is_green_span, node.children)

		if (green_span != null) {
			green_span.attribs = {}
			node.name = "aside"
			node.children = [{
				name: "p",
				type: "tag",
				parent: node,
				prev: null,
				next: null,
				children: node.children,
			}]
			node.attribs = {}
			node.children[0].children.forEach(child => child.parent = node.children[0])
		}
	})
}

export function processHeadings(html:string):string {
	// Needs to maintain children but strip any <b> tags
	/*
	 * <p ...style=text-align:center...>[HEADING]</p>
	 */
	const is_h1 = node =>
		node.attribs.style &&
		node.attribs.style.match(/text-align:(\s*)center/)

	const is_b = node =>
		node != null &&
		node.type == "tag" &&
		node.name == "b"

	return processTagWithFn(html, "p", node => {
		if (is_h1(node)) {
			node.name = "h1"
			node.attribs = {}

			// Remove any b tags that are children
			const bs = DomUtils.findAll(is_b, node.children)
			bs.forEach(b => {
				b.name = "span"
			})
		}
		else {
			// Search for a solo b tag
			let children = node.children

			while (children && children.length == 1) {
				if (is_b(children[0])) {
					node.name = "h2"
					node.children = children[0].children
					node.children.forEach(child => child.parent = node)
					break
				}
				else {
					children = children[0].children
				}
			}
		}
	})
}

export function processLinks(html:string):string {
	const is_red_span = node =>
		node != null &&
		node.type == "tag" &&
		node.name == "span" &&
		node.attribs &&
		node.attribs.style &&
		node.attribs.style.match(/color:(\s*)red/i)

	//TODO: next to extract list of next links for whole of DOM and then search through spans,
	//otherwise this will only process links in <p> tags
	return processTagWithFn(html, "span", (span, idx, all_red_spans) => {
		let name = DomUtils.getText(span)
		const matches = name.match(/^((?:\s*(?:[^\s\[]))+)(?:[\s]*)(?:\[(.*)\]){0,1}/)
		let uri = ""

		if (!matches)
			return

		name = matches[1]

		if (matches[2] !== undefined) {
			uri = matches[2]
		}
		else {
			// Check next span
			if ((idx+1) < all_red_spans.length) {
				const next = all_red_spans[idx+1]

				uri = DomUtils.getText(next).match(/^\s*\[(.*)\]\s*$/)
				if (uri != null) {
					// Set the URI and then erase the node
					uri = uri[1]
					DomUtils.removeElement(next)

					next.type = 'text'
					next.data = ''
					next.attribs = undefined
				}
			}
		}

		span.name = "a"
		span.attribs = {
			href: "/" + (uri || ''),
		}
		span.children = [{
			data: name,
			type: 'text',
			next: null,
			prev: null,
			parent: span.children[0].parent,
		}]
	}, is_red_span)
	// TODO:Need to insert extra spaces if following node is not a word boundary
		.replace(/<\/a>([A-Za-z0-9\(<])/igm, "</a> $1")
}

export function processLists(html:string):string {
	/**
	 * <p...><span style='mso-list:Ignore'>[SYMBOL]...</span>...[LISTITEM]</p>
	 * <p...><span style='mso-list:Ignore'>[SYMBOL]...</span>...[LISTITEM]</p>
	 */
	/**
	 *	<ul>
	 *		<li>[LISTITEM]</li>
	 *		<li>[LISTITEM]</li>
	 *	</ul>
	 */

	const has_list_style = node =>
		node != null &&
		node.attribs &&
		node.attribs.style &&
		node.attribs.style.match(/mso-list:(\s*)Ignore/i)

	const is_list = node =>
		node != null &&
		node.type == "tag" &&
		(node.name == "ul" || node.name == "ol")

	const is_list_item = node =>
		node.children &&
		node.children.length &&
		DomUtils.existsOne(has_list_style, node.children)

	return processTagWithFn(html, "p", node => {
		if (is_list_item(node)) {
			// Remove bullets etc
			DomUtils.findAll(has_list_style, node.children).forEach(child => {
				child.type = "text"
				child.data = ""
				child.children = undefined
			})

			// Need to either convert it into an ul or a li
			if (is_list(node.parent)) {
				// Convert to li
				node.name = "li"
			}
			else {
				// Convert to ul and put following list items inside it
				node.name = "ul"
				// Put siblings inside it
				// First make a new list item which contains what this previous contained
				const li = {
					type: "tag",
					name: "li",
					children: [...node.children],
					parent: node,
					prev: null,
					next: null,
				}

				li.children.forEach(child => child.parent = li)

				// Now gather all the list items in this new list
				let new_items = [li]
				let next = node.next

				for (;;) {
					if (next == null)
						break

					if (next.type == "tag" && !is_list_item(next))
						break

					// Create the copy
					let clone = {
						...next,
						name: "li",
						prev: new_items[new_items.length - 1],
						next: null,
						parent: node,
						attribs: {},
					}

					clone.prev.next = next
					;(clone.children||[]).forEach(child => child.parent = clone)
					new_items.push(clone)

					// Erase the original
					next.type = "text"
					next.name = undefined
					next.data = ""

					next = next.next
				}

				// Set the .next of the last item to null
				new_items[new_items.length-1].next = null

				node.children = new_items
			}

			node.attribs = {}
		}
	})
}

export function processFigures(html:string):string {
	/*
	 * 	<p...>
	 * 		...
	 * 		<span...style='color:#00B0F0'>
	 * 			...
	 * 			Figure [N]...{[URI]}...
	 * 		</span>
	 * 		...
	 * 	</p>
	 * 	...
	 * 	<p>
	 * 		...
	 * 		<span...style='color:#00B0F0'>[CAPTION]</span>
	 * 		...
	 * 	</p>
	 */
	/*
	 *	<figure>
	 *		<img src="/[URI]">
	 *		<figcaption><strong>Figure [N]:</strong> [CAPTION]</figcaption>
	 *	</figure>
	 */
	const get_next_tag = node => {
		let next = node.next

		while (next != null && next.type != "tag")
			next = next.next

		return next
	}

	const is_blue_span = node =>
		node != null &&
		node.type == "tag" &&
		node.name == "span" &&
		node.attribs &&
		node.attribs.style &&
		(
			node.attribs.style.match(/color:(\s*)#00B0F0/i) ||
			node.attribs.style.match(/color:(\s*)#34ADEF/i)
		)

	const is_figure = node =>
		DomUtils.existsOne(is_blue_span, node.children)
	
	const next_has_caption = node =>
		get_next_tag(node) != null &&
		DomUtils.existsOne(is_blue_span, get_next_tag(node).children)

	return processTagWithFn(html, "p", node => {
		if (is_figure(node)) {
			const text  = DomUtils.getText(node)
			const match = text.match(/Figure(?:.*?)([0-9]+)(?:[^{]*)\{([^}]*)\}/im)

			if (match) {
				let caption = ""

				if (next_has_caption(node)) {
					const next_tag = get_next_tag(node)
					caption = DomUtils.getText(next_tag)
					next_tag.type = "text"
					next_tag.data = ""
				}

				node.name = "figure"
				node.attribs = undefined
				node.children = []
				DomUtils.appendChild(node, {
					type: "tag",
					name: "img",
					attribs: {src: "/" + match[2]},
				})
				DomUtils.appendChild(node, {
					type: "tag",
					name: "figcaption",
					children: [{
						type:"tag",
						name:"strong",
						children: [{
							type: "Text",
							data: "Figure " + match[1] + ":",
						}],
					}, {
						type: "text",
						data: " " + caption,
					}],
				})
			}
		}
	})
}

export function stripEmptyTags(html:string):string {
	// Need to repeat to remove nested tags
	/* Regex explanation
	 *  - [^>] to prevent matching more than one tag
	 *  - Allows attributes
	 *  - Ignores whitespace or non-breaking space in tags
	 *  - Uses backreference to ensure it is closed on the same tag that opened
	 */
	return multiplePassProcess(html, str => str.replace(/<([^>]+)(?:[ ]*)(?:[^>]*)>(?:(?:(\s)|(?:&nbsp;))*)<\/\1>/igm, '$2'))
}

export function stripForbiddenTagsAndAttributes(html:string):string {
	// Force the body into an acceptable format
	// Allow only a super restricted set of tags and attributes
	let reduced_body = ""
	for(;;) {
		reduced_body = sanitizeHtml(html, {
			allowedTags: ["h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "p", "a", "ul", "ol",
				"li", "strong", "em", "table", "thead", "caption", "tbody", "tfoot", "tr", "th", "td",
				"figure", "abbr", "img", "aside", "caption", "cite", "dd", "dfn", "dl", "dt", "figcaption",
				"sub", "sup", "i", "span"],
			allowedAttributes: merge({
				th: ["colspan", "rowspan"],
				td: ["colspan", "rowspan"],
			}, sanitizeHtml.defaults.allowedAttributes),
			transformTags: {'b': 'strong'},
			textFilter: (text, stack) => {
				// Remove things not in a tag at all
				if (stack && stack.length == 0)
					// If it's not in a container class
					return text
					// Remove any non-whitespace characters
						.replace(/[^\s]+/g, "")
					// Remove any blank lines
						.replace(/[\n]+/g, "\n") // Unix
						.replace(/(\r\n)+/g, "\r\n") // Windows
				else
					return text
			},
		})

		if (reduced_body == html)
			break

		html = reduced_body
	}

	return html
}

export default function normalize(html:string):string {
	// Strip empty tags before and after to prevent spurious metadata when processing and after processing
	const processes = [stripEmptyTags, processTables, processAsides, processHeadings, processFigures, processLists, processLinks, stripForbiddenTagsAndAttributes, stripEmptyTags]

	/*
	console.log('starting with >')
	console.group()
	console.log(html)
	console.groupEnd()*/

	processes.forEach(proc => {
		html = proc(html)
			/*console.log('Calling %s >', proc.name)
		console.group()
		console.log(html)
		console.groupEnd()*/
	})
		/*
	console.log('finished with >')
	console.group()
	console.log(html)
	console.groupEnd()*/

	return html
}
