import React          from "react";
import TernaryPlot    from "./ternaryplot";
import Slider         from "./slider";
import DescriptorList from "./descriptorlist";
import {keys}         from "lodash";

export default class MTStage extends React.Component {
	constructor(props) {
		super(props);

		if (keys(props.context).length > 3) {
			var step = 1;
			var descriptors = keys(props.context);
		}

		this.state = {
			step:     step || 0,
			selected: [],
			ratios:   [0.3333, 0.3333, 0.3333],
			severity: 0.5,
			descriptors: descriptors || [],
			title:    "Overview",
		};

		this.setContext = this.setContext.bind(this);
	}

	static get propTypes() {
		return {
			context:     React.PropTypes.object.isRequired,
			ratios:      React.PropTypes.arrayOf(React.PropTypes.number),
			severity:    React.PropTypes.number,
			onComplete:  React.PropTypes.func,
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
			if (remainingDescriptors > 1)
				label = `Choose ${remainingDescriptors} more items`;
			else
				label = "Choose 1 more item";
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
		this.setState({
			title: path,
			descriptors: keys(this.props.context[path]),
			step: 1,
		});
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
								<p key={label}><button className="preferred" onClick={_ => this.setContext(label)}>{label}</button></p>)}
					{this.state.step == 1 &&
						<div>
							<p>Choose <strong>three</strong> things to evaluate your current condition.</p>
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
				</div>
			</div>
		);
	}
}
