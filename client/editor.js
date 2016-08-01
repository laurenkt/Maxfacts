import React from 'react';
import ReactDOM from 'react-dom';
import RichTextEditor from 'react-rte';

class Editor extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			value: RichTextEditor.createValueFromString(this.props.value, 'html'),
			html: false
		}

		this.onChange     = this.onChange.bind(this);
		this.onChangeText = this.onChangeText.bind(this);
		this.rows = 1;
	}

	static get propTypes() {
		return {
			onChange: React.PropTypes.func,
			value:    React.PropTypes.string,
			id:       React.PropTypes.string
		};
	}

	onChange(value) {
		this.rows = value.toString('html').split(/\r?\n/).length;
		this.setState({value});
	}
	
	onChangeText(e) {
		this.rows = e.target.value.split(/\r?\n/).length;
		this.setState({value: RichTextEditor.createValueFromString(e.target.value, 'html')});
	}

	render() {
		var rte = () => <RichTextEditor blockRendererFn={a => console.log(a)} toolbarClassName="editor-toolbar" editorClassName="editor" value={this.state.value} onChange={this.onChange} />

		return (
			<div>
				<p><label>
					<input type="checkbox" onChange={(e) => this.setState({html: e.target.checked})} checked={null} />
					<span className="label-body">Edit in raw HTML</span>
				</label></p>
				<textarea rows={this.rows} name={this.props.name} style={{display: this.state.html ? 'block' : 'none'}} onChange={this.onChangeText} value={this.state.value.toString('html')}></textarea>
				{this.state.html || rte()}
			</div>
		);
	}
}

document.addEventListener("DOMContentLoaded", e => {
	var textarea  = document.getElementsByTagName('textarea').item(0);
	var container = document.createElement('div');
	ReactDOM.render(<Editor name={textarea.getAttribute('name')} value={textarea.value} />, container);
	
	textarea.parentNode.replaceChild(container.childNodes[0], textarea);
});
