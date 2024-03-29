import React from "react"

const colspan = props => {
	const { data } = props.node

	if (data.get("attribs").colspan)
		props.attributes.colSpan = data.get("attribs").colspan

	return props
}

export default (valid_uris) => ({
	nodes: {
		"paragraph": props => <p {...props.attributes}>{props.children}</p>,
		"list":      props => <ul {...props.attributes}>{props.children}</ul>,
		"heading-1": props => <h4 {...props.attributes}>{props.children}</h4>,
		"heading-2": props => <h5 {...props.attributes}>{props.children}</h5>,
		"heading-3": props => <h6 {...props.attributes}>{props.children}</h6>,
		"heading-4": props => <h6 {...props.attributes}>{props.children}</h6>,
		"heading-5": props => <h6 {...props.attributes}>{props.children}</h6>,
		"heading-6": props => <h6 {...props.attributes}>{props.children}</h6>,
		"caption":   props => <caption {...props.attributes}>{props.children}</caption>,
		"list-item": props => <li {...props.attributes}>{props.children}</li>,
		"num-list":  props => <ol {...props.attributes}>{props.children}</ol>,
		"tr":        props => <tr {...colspan(props).attributes}>{props.children}</tr>,
		"td":        props => <td {...colspan(props).attributes}>{props.children}</td>,
		"th":        props => <th {...colspan(props).attributes}>{props.children}</th>,
		"aside":     props => <aside {...props.attributes}>{props.children}</aside>,
		"img":       props => {
			const src    = props.node.data.get('src')
			const height = props.node.data.get('height')
			const width  = props.node.data.get('width')

			return <img src={src} height={height} width={width} />
		},
		"video":       props => {
			const src    = props.node.data.get('src')

			return <video controls="controls">
				<source src={src} type="video/mp4" />
				This browser not capable of playing embedded video.
			</video>;
		},
		"br":        _ => <br />,
		"hr":        _ => <hr />,
		"link": props => {
			const href      = props.node.data.get("href")
			const className = props.node.data.get("class")

			const implicitClassName = valid_uris.includes(href) ? 'found' : 'not_found'

			return <a href={href} className={className + ' ' + implicitClassName} {...props.attributes}>{props.children}</a>
		},
		"figure": props => {
			let { node, data, state } = props
			let className = ""
			let src = ''

			if (node) {
				data = node.data
				const isFocused = state.selection.hasEdgeIn(node)
				className = isFocused ? "active" : null
				src = data.get('src');
			}

			return (
				<figure {...props.attributes} className={className}>
					{(src.match(/\.mp4$/i) &&
						<video controls="controls">
							<source src={src} type="video/mp4" />
							This browser not capable of playing embedded video.
						</video>) ||
						<img src={src} />}
					<figcaption>{props.children}</figcaption>
				</figure>
			)
		},
		"table": props =>
			<table {...props.attributes}>
				{props.children[0]}
				<tbody>{props.children.slice(1)}</tbody>
			</table>,
	},
	marks: {
		bold:       props => <strong>{props.children}</strong>,
		emphasis:   props => <em>{props.children}</em>,
		italic:     props => <i>{props.children}</i>,
		underlined: props => <u>{props.children}</u>,
		sub:        props => <sub>{props.children}</sub>,
		sup:        props => <sup>{props.children}</sup>,
	},
})

