import React from "react";

const colspan = props => {
	const { data } = props.node;

	if (data.get("attribs").colspan)
		props.attributes.colSpan = data.get("attribs").colspan;

	return props;
}

export default {
	nodes: {
		"paragraph": props => <p {...props.attributes}>{props.children}</p>,
		"bulleted-list": props => <ul {...props.attributes}>{props.children}</ul>,
		"heading-1": props => <h3 {...props.attributes}>{props.children}</h3>,
		"heading-2": props => <h4 {...props.attributes}>{props.children}</h4>,
		"heading-3": props => <h5 {...props.attributes}>{props.children}</h5>,
		"heading-4": props => <h6 {...props.attributes}>{props.children}</h6>,
		"heading-5": props => <h6 {...props.attributes}>{props.children}</h6>,
		"heading-6": props => <h6 {...props.attributes}>{props.children}</h6>,
		"caption": props => <caption {...props.attributes}>{props.children}</caption>,
		"list-item": props => <li {...props.attributes}>{props.children}</li>,
		"numbered-list": props => <ol {...props.attributes}>{props.children}</ol>,
		"tr": props => <tr {...colspan(props).attributes}>{props.children}</tr>,
		"td": props => <td {...colspan(props).attributes}>{props.children}</td>,
		"th": props => <th {...colspan(props).attributes}>{props.children}</th>,
		"aside": props => <aside {...props.attributes}>{props.children}</aside>,
		"link": (props) => {
			let data = props.node ? props.node.data : props.data;
			const href = data.get("href");
			return <a href={href} {...props.attributes}>{props.children}</a>;
		},
		"figure": (props) => {
			let { node, data, state } = props;
			let className = "";

			if (node) {
				data = node.data;
				const isFocused = state.selection.hasEdgeIn(node);
				className = isFocused ? "active" : null;
			}

			const src = data.get("src");

			return (
				<figure {...props.attributes} className={className}>
					<img src={src} />
					<figcaption>{props.children}</figcaption>
				</figure>
			);
		},
		"table": props =>
			<table {...props.attributes}>
				{props.children[0]}
				<tbody>{props.children.slice(1)}</tbody>
			</table>,
	},
	marks: {
		bold: props => <strong>{props.children}</strong>,
		italic: props => <em>{props.children}</em>,
		underlined: props => <u>{props.children}</u>,
		sub: props => <sub>{props.children}</sub>,
		sup: props => <sup>{props.children}</sup>,
	},
};

