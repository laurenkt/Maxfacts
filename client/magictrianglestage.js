import React          from 'react';
import TernaryPlot    from './ternaryplot';
import Slider         from './slider';
import DescriptorList from './descriptorlist';

export default class MagicTriangleStage extends React.Component {
	constructor(props) {
		super(props);

		console.log(props.descriptors.length);
		// If only 3 descriptors are provided there is not much point in
		// asking the user to select them - so do it automatically
		const skipStep0 = (props.descriptors.length == 3);

		this.state = {
			step:     skipStep0 ? 1 : 0,
			selected: skipStep0 ? props.descriptors : [],
			ratios:   [0.3333, 0.3333, 0.3333],
			severity: 0.5,
		};
	}

	static get propTypes() {
		return {
			onComplete:  React.PropTypes.func,
			descriptors: React.PropTypes.arrayOf(React.PropTypes.string).isRequired
		};
	}

	onDescriptorChange(descriptor, e) {
		this.setState({
			selected: e.target.checked ?
				this.state.selected.concat([descriptor]) :
				this.state.selected.filter(d => d != descriptor)
		});
	}

	labelForStep0() {
		var remainingDescriptors = 3 - this.state.selected.length;
		var label = 'Next';
		var disabled = "";

		if (remainingDescriptors > 0) {
			disabled = "disabled";
			if (remainingDescriptors > 1)
				label = 'Choose ' + remainingDescriptors + ' more items';
			else
				label = 'Choose 1 more item';
		}

		return label;
	}

	complete() {
		if (this.props.onComplete)
			this.props.onComplete(this.state.selected, this.state.ratios, this.state.severity);
	}

	render() {
		return (
			<div>
				{this.state.step == 0 &&
					<div>
						<h2>Step 1</h2>
						<p>Choose <strong>three</strong> things to evaluate your current condition.</p>
						<DescriptorList items={this.props.descriptors} onSelection={selected => this.setState({selected})} />
						<button disabled={this.state.selected.length != 3} onClick={e => this.setState({step: 1})}>{this.labelForStep0()}</button>
					</div>}
				{this.state.step == 1 &&
					<div>
						<h2>Step 2</h2>
						<p>Now adjust the circle in the triangle below towards the labels which bother you the most. I.e. move the circle closest to '{this.state.selected[0]}' if that's the biggest problem.</p>
						<TernaryPlot values={this.state.ratios} labels={this.state.selected} onChange={ratios => this.setState({ratios})} />
						<button onClick={e => this.setState({step: 2})}>Next</button>
					</div>}
				{this.state.step == 2 &&
					<div>
						<h2>Step 3</h2>
						<p>This is what you told us:</p>
						<TernaryPlot className="completed" disabled values={this.state.ratios} labels={this.state.selected} />
						<p>Adjust the slider below to describe the severity of this problem.</p>
						<Slider value={this.state.severity} onChange={severity => this.setState({severity})} />
						<button onClick={e => this.complete()}>Next</button>
					</div>}
			</div>
		);
	}
}
