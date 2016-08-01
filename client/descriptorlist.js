import React from 'react';

module.exports = class DescriptorList extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			selected: []
		};
	}

	static get propTypes() {
		return {
			onSelection: React.PropTypes.func,
			items:       React.PropTypes.array
		};
	}

	onChange(descriptor, e) {
		var new_selected = e.target.checked ?
			this.state.selected.concat([descriptor]) :
			this.state.selected.filter(d => d != descriptor);

		this.setState({selected: new_selected});

		// Raise callback
		if (this.props.onSelection)
			this.props.onSelection(new_selected);
	}

	render() {
		// Should non-selected descriptors be disabled?
		var disabled = "";
		if (this.state.selected.length >= 3) disabled = "disabled";

		var desc = this.props.items.sort().map(d => {
			// Should this descriptor be disabled
			var disabled = "disabled";
			if (this.state.selected.includes(d) || this.state.selected.length < 3)
				disabled = "";

			var checked = "";
			if (this.state.selected.includes(d)) checked="checked";

			return (
				<label key={d} className={disabled}>
					<input type="checkbox" onChange={this.onChange.bind(this, d)} checked={checked} disabled={disabled} />
					<span className="label-body">{d}</span>
				</label>
			)
		});
		
		return <div className="checkboxes">{desc}</div>
	}
}
