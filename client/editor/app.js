import React from "react";
import ReactDOM from "react-dom";
import {Editor as RichTextEditor} from "slate";
import {serialize, deserialize} from "./serializer.js";
import Schema from "./schema.js";

class Editor extends React.Component {
	constructor(props) {
		super(props);

		const initial_state = deserialize(props.value);

		this.state = {
			slate_state:     initial_state,
			html_value:      serialize(initial_state),
			editing_in_html: false,
		};

		this.onTextAreaChange = this.onTextAreaChange.bind(this);
		this.onEditorChange   = this.onEditorChange.bind(this);
		this.onDocumentChange = this.onDocumentChange.bind(this);
		this.onEditModeChange = this.onEditModeChange.bind(this);

		this.rows = Math.min(props.value.split(/\r?\n/).length, 20);
	}

	static get propTypes() {
		return {
			onChange: React.PropTypes.func,
			state:    React.PropTypes.object,
			value:    React.PropTypes.string,
			id:       React.PropTypes.string,
		};
	}

	onEditorChange(state) {
		console.log("onEditorChange");
		this.setState({slate_state: state});
	}

	onTextAreaChange(e) {
		console.log("onTextAreaChange");
		this.rows = Math.min(e.target.value.split(/\r?\n/).length, 20);
		this.setState({html_value: e.target.value});
	}

	onDocumentChange(document, state) {
		console.log("onDocumentChange");
		this.setState({html_value: serialize(state)});
	}

	onEditModeChange(e) {
		console.log("onEditModeChange", e.target.checked, this.state.html_value);
		this.setState({
			editing_in_html: e.target.checked,
			slate_state: e.target.checked ? this.state.slate_state : deserialize(this.state.html_value),
		});
	}

	render() {
		return (
			<div>
				<p>
					<label>
						<input
							type="checkbox"
							onChange={this.onEditModeChange}
							checked={null} />
						<span className="label-body">Edit in raw HTML</span>
					</label>
				</p>
				<textarea
					rows={this.rows}
					name={this.props.name}
					style={{display: this.state.editing_in_html ? "block" : "none"}}
					onChange={this.onTextAreaChange}
					value={this.state.html_value} />
				{this.state.editing_in_html ||
					<RichTextEditor
						schema={Schema}
						state={this.state.slate_state}
						onChange={this.onEditorChange}
						onDocumentChange={this.onDocumentChange} />}
			</div>
		);
	}
}

document.addEventListener("DOMContentLoaded", e => {
	const textarea  = document.getElementsByTagName("textarea").item(0);
	const container = document.createElement("div");
	container.className = "content-editor";

	ReactDOM.render(<Editor name={textarea.getAttribute("name")} value={textarea.value} />, container);
	
	textarea.parentNode.replaceChild(container.childNodes[0], textarea);
});
