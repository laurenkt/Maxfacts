import React from 'react';

module.exports = class DescriptorList extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			// List of currently selected 
			selected: []
		};
	}

	static get propTypes() {
		return {
			// Callback invoked when descriptor list changes
			onSelection: React.PropTypes.func,
			// List of descriptors to select from
			items:       React.PropTypes.array.isRequired
		};
	}

	onChange(descriptor, e) {
		// Either append it or filter it based on whether the item was checked or unchecked
		var new_selected = e.target.checked ?
			this.state.selected.concat([descriptor]) :
			this.state.selected.filter(d => d != descriptor);

		// Always show items in the same order
		new_selected = new_selected.sort();

		// Update component state
		this.setState({selected: new_selected});

		// Raise callback
		if (this.props.onSelection)
			this.props.onSelection(new_selected);
	}

	render() {
		return (
			<div className="checkboxes">
				{this.props.items.sort().map(d => {
					// Item is disabled if there are more than 3 elements selected, and this is not one of them
					var disabled = this.state.selected.length >= 3 && !this.state.selected.includes(d);

					return (
						<label key={d} className={disabled ? 'disabled' : ''}>
							<input type="checkbox" onChange={this.onChange.bind(this, d)}
								checked={this.state.selected.includes(d)}
								disabled={disabled} />
							<span className="label-body">{d}</span>
						</label>
						);
				})}
			</div>
		);
	}
}
