import React          from "react";
import TernaryPlot    from "./ternary-plot";
import Slider         from "./slider";
import DescriptorList from "./descriptor-list";
import {keys}         from "lodash";

export default class Cell extends React.Component {
	constructor(props) {
		super(props);

		const descriptors = keys(props.context);

		this.state = {
			step:     0,
			selected: descriptors.length == 3 ? descriptors : [],
			ratios:   [0.3333, 0.3333, 0.3333],
			severity: 0.5,
			descriptors: descriptors,
			title:    props.title || String.fromCodePoint(0x00A0), // non-breaking space
		};
	}

	static get propTypes() {
		return {
			title:       React.PropTypes.string,
			context:     React.PropTypes.object.isRequired,
			ratios:      React.PropTypes.arrayOf(React.PropTypes.number),
			severity:    React.PropTypes.number,
			onLabelClick:React.PropTypes.func.isRequired,
		};
	}

	onDescriptorChange(descriptor, e) {
		this.setState({
			selected: e.target.checked ?
				this.state.selected.concat([descriptor]) :
				this.state.selected.filter(d => d != descriptor),
		});
	}

	labelForStep0() {
		var remainingDescriptors = 3 - this.state.selected.length;
		var label = "Next";

		if (remainingDescriptors > 0) {
			label = `Choose ${remainingDescriptors} more`;
		}

		return label;
	}

	decorateLabels() {
		return this.state.selected.map(label => {
			var current_context = this.props.context[label];
			if (!current_context)
				return label;

			return (
				<a href="#" onClick={e => {
					// Otherwise the page will scroll
					e.preventDefault();
					// Pass to handler
					this.props.onLabelClick(label);
				}}>{label}</a>
			);});
	}

	render() {
		return (
			<div className="mt-cell">
				<h3>{this.state.title} {this.props.title && <a href="#" onClick={e => {e.preventDefault(); this.props.onRemove();}}>&#x2715; delete</a>}</h3>
				{this.state.step == 0 &&
					<div>
						<p>Pick <strong>three</strong> categories to compare.</p>
						<DescriptorList items={this.state.descriptors} selected={this.state.selected} onSelection={selected => this.setState({selected})} />
						<button disabled={this.state.selected.length != 3} onClick={_ => this.setState({step: 1})}>{this.labelForStep0()}</button>
					</div>}
				{this.state.step == 1 &&
					<div>
						<TernaryPlot values={this.state.ratios} labels={this.decorateLabels()} onChange={ratios => this.setState({ratios})} />
						<Slider value={this.state.severity} onChange={severity => this.setState({severity})} />
					</div>}
			</div>
		);
	}
}
