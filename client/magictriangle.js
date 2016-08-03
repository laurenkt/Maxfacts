import React          from 'react';
import ReactDOM       from 'react-dom';
import TernaryPlot    from './ternaryplot';
import Slider         from './slider';
import DescriptorList from './descriptorlist';

class MagicTriangle extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			step: 0,
			selected: [],
			a: 0.3333,
			b: 0.3333,
			c: 0.3333,
			value: 0.5
		};

		this.plot = {};
		this.slider = {};
	}

	onDescriptorChange(descriptor, e) {
		this.setState({
			selected: e.target.checked ?
				this.state.selected.concat([descriptor]) :
				this.state.selected.filter(d => d != descriptor)
		});
	}

	callbackChangeToStep(stepNo) {
		return (e) => {
			this.setState({step: stepNo});
			e.preventDefault();
			return false;
		};
	}

	editLinkForStep(stepNo) {
		return <a href="#" onClick={this.callbackChangeToStep(stepNo)}>Edit</a>;
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

	render() {
		return (
			<div>
				{this.state.step > 0 &&
					<p className="completed">Step 1 (completed) — {this.state.selected.join(', ')} — {this.editLinkForStep(0)}</p>}
				{this.state.step > 1 &&
					<div className="completed">
						<p>Step 2 (completed) — {this.editLinkForStep(1)}</p>
						<TernaryPlot disabled a={this.state.a} b={this.state.b} c={this.state.c}
							labels={this.state.selected} />
					</div>}
				{this.state.step > 2 &&
					<div className="completed">
						<p>Step 3 (completed) — {this.editLinkForStep(2)}</p>
						<Slider disabled value={this.state.value} nolabels />
					</div>}
				<Choose>
					<When condition={this.state.step == 0}>
						<h2>Step 1</h2>
						<p>Choose <strong>three</strong> things that make your accomodation miserable.</p>
						<DescriptorList items={this.props.descriptors} onSelection={s => this.setState({selected: s})} />
						<button disabled={this.state.selected.length != 3} onClick={e => this.setState({step: 1})}>{this.labelForStep0()}</button>
					</When>
					<When condition={this.state.step == 1}>
						<h2>Step 2</h2>
						<p>Move the circle in the triangle towards the corners which describe the relative misery of your three labels i.e. move the circle closest to '{this.state.selected[0]}' if that makes you the most miserable.</p>
						<TernaryPlot a={this.state.a} b={this.state.b} c={this.state.c}
							labels={this.state.selected} onChange={v => this.setState(v)} />
						<button onClick={e => this.setState({step: 2})}>Next</button>
					</When>
					<When condition={this.state.step == 2}>
						<h2>Step 3</h2>
						<p>Adjust the slider to describe the severity of the problem.</p>
						<Slider value={this.state.value} onChange={v => this.setState(v)} />
						<button onClick={e => this.setState({step: 3})}>Next</button>
					</When>
					<When condition={this.state.step == 3}>
						<h2>Summary</h2>
						<table>
							<tbody>
								<tr><th colSpan="3">Level 1</th></tr>
								<tr>
									<td>{this.state.selected[0]}: {Math.round(this.state.a * 100.0)}%</td>
									<td>{this.state.selected[1]}: {Math.round(this.state.b * 100.0)}%</td>
									<td>{this.state.selected[2]}: {Math.round(this.state.c * 100.0)}%</td>
								</tr>
								<tr>
									<td colSpan="3">Overall severity: {Math.round(this.state.value * 100.0)}%</td>
								</tr>
							</tbody>
						</table>
					</When>
				</Choose>
			</div>
		);
	}
}

var descriptors = ["Appearance", "Eating/Drinking", "Fatigue", "Pain", "Intimacy/Sex", "Talking", "Work"];
document.addEventListener("DOMContentLoaded", (e) =>
	ReactDOM.render(<MagicTriangle descriptors={descriptors} />, document.getElementById('magicTriangle')));
