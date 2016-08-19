import React          from "react";
import TernaryPlot    from "./ternaryplot";
import Slider         from "./slider";
import DescriptorList from "./descriptorlist";
import {keys}         from "lodash";

export default class Column extends React.Component {
	constructor(props) {
		super(props);

		this.skipped = 0;

		// If there is more than 3 keys in the context we know it must be the top level
		// so jump to the first step
		if (keys(props.context).length > 3) {
			this.skipped = 1;
			var descriptors = keys(props.context);
		}
		else {
			let valid_labels = keys(props.context).filter(label => this.props.context[label] != null);
			if (valid_labels.length == 1) {
				// There can only be one option, so just select it automatically
				this.skipped = 1;
				descriptors = keys(props.context[valid_labels[0]]);
				var title = valid_labels[0];
			}
		}

		if (this.skipped == 1) {
			// We might be able to skip this step too
			if (descriptors.length == 3) {
				// If there's only 3 descriptors we might as well select them and jump to the next step
				var selected = descriptors;
				this.skipped = 2;
			}
		}

		this.state = {
			step:     this.skipped,
			selected: selected || [],
			ratios:   [0.3333, 0.3333, 0.3333],
			severity: 0.5,
			descriptors: descriptors || [],
			title:    title || String.fromCodePoint(0x00A0), // non-breaking space
		};

		this.setContext = this.setContext.bind(this);
	}

	static get propTypes() {
		return {
			context:     React.PropTypes.object.isRequired,
			ratios:      React.PropTypes.arrayOf(React.PropTypes.number),
			severity:    React.PropTypes.number,
			onComplete:  React.PropTypes.func,
			onCancel:    React.PropTypes.func,
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

	complete() {
		this.setState({
			step: 3,
		});

		if (this.props.onComplete)
			this.props.onComplete(this.state.title, this.state.selected, this.state.ratios, this.state.severity);
	}

	setContext(path) {
		var descriptors = keys(this.props.context[path]);

		if (descriptors.length != 3) {
			this.setState({
				title: path,
				descriptors,
				step: 1,
			});
		}
		else {
			this.setState({
				title: path,
				descriptors,
				selected: descriptors,
				step: 2,
			});
		}
	}

	render() {
		return (
			<div className={"-mt-stage " + (this.state.step < 3 ? "current" : "completed")}>
				<div>
					<h3>{this.state.title}</h3>
					{this.state.step == 0 &&
						<p>Choose a descriptor to expand on:</p>}
					{this.state.step == 0 &&
						keys(this.props.context)
						// Ensure we only show descriptors that actually have a sub-tree (can be expanded)
							.filter(label => this.props.context[label] != null)
						// Display the results
							.map(label =>
								<p key={label}><button onClick={_ => this.setContext(label)}>{label}</button></p>)}
					{this.state.step == 1 &&
						<div>
							<p>Pick <strong>three</strong> categories to compare.</p>
							<DescriptorList items={this.state.descriptors} onSelection={selected => this.setState({selected})} />
							<button disabled={this.state.selected.length != 3} onClick={_ => this.setState({step: 2})}>{this.labelForStep0()}</button>
						</div>}
					{this.state.step == 2 &&
						<div>
							<TernaryPlot values={this.state.ratios} labels={this.state.selected} onChange={ratios => this.setState({ratios})} />
							<Slider value={this.state.severity} onChange={severity => this.setState({severity})} />
							<button onClick={_ => this.complete()}>Next</button>
						</div>}
					{this.state.step == 3 &&
						<div>
							<TernaryPlot values={this.state.ratios} labels={this.state.selected} disabled />
							<Slider value={this.state.severity} disabled />
							<div className="check">&#x2714;</div>
						</div>}
					{this.state.step == this.skipped && this.props.onCancel &&
						<p>Or <a href="#" onClick={e => { e.preventDefault(); this.props.onCancel(); }}>finish this set</a>.</p>}
				</div>
			</div>
		);
	}
}
