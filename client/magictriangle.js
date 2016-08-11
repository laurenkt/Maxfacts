import React    from 'react';
import ReactDOM from 'react-dom';
import MagicTriangleStage from './magictrianglestage';
import TernaryPlot from './ternaryplot';
import {keys, filter,
	property, find} from 'lodash';

class MagicTriangle extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			results: [],
			targetLevel: '',
			furtherInput: false,
			finished: false
		}

		/*
		this.descriptors = [
			{
				name: 'Appearance',
				children: [
					{name: 'Self',           children: []},
					{name: 'Others Private', children: []},
					{name: 'Others Public',  children: []},
				]
			},
			{
				name: 'Eating/Drinking',
				children: [
					{name: 'Inability to Swallow', children: [
						{name: 'Dry Mouth', children: []},
						{name: 'Fluids',    children: []},
						{name: 'Solids',    children: []},
					]},
					{name: 'Loss of Appetite',     children: []},
					{name: 'Impaired Taste/Smell', children: []},
					{name: 'Inability to Chew',    children: []},
					{name: 'Embarassment',         children: []},
					{name: 'Voluntary/involuntary swallowing', children: []},
				]
			},
			{
				name: 'Fatigue',
				children: [
					{name: 'Physically Exhausted', children: [
						{name: 'Unable to do everyday stuff', children: []},
						{name: 'Unable to do gentle exercise',    children: []},
						{name: 'Unable to do strenuous exercise',    children: []},
					]},
					{name: 'Mentally Exhausted',     children: []},
					{name: 'Emotionally Exhausted', children: []},
				]
			},
			];*/

		this.descriptors = {
			"Appearance": {
				"Self": null,
				"Others Private": null,
				"Others Public": null
			},
			"Eating/Drinking": {
				"Inability to Swallow": {
					"Dry Mouth": null,
					"Fluids": null,
					"Solids": null
				},
				"Loss of Appetite": null,
				"Impaired Taste/Smell": null,
				"Inability to Chew": null,
				"Embarrassment": null,
				"Voluntary/involuntary Swallowing": null
			},
			"Fatigue": {
				"Physically Exhausted": {
					"Unable to do everyday stuff": null,
					"Unable to do gentle exercise": null,
					"Unable to do strenuous excercise": null
				},
				"Mentally Exhausted": {
					"Physically capable but still unable to do everyday stuff": null,
					"Unable to concentrate": null,
					"Brain fog/thinking and coordination impaired": null
				},
				"Emotionally Exhausted": {
					"Self": null,
					"Private/Partner": null,
					"Public": null
				}
			},
			"Pain": {
				"Severity": {
					"Interference with everyday functioning": null,
					"Sleep interruption": null,
					"Insufficient analgesia": null,
					"Mood": null
				},
				"Frequency": {
					"Interference with everyday functioning": null,
					"Sleep interruption": null,
					"Insufficient analgesia": null,
					"Mood": null
				},
				"Longevity": {
					"Interference with everyday functioning": null,
					"Sleep interruption": null,
					"Insufficient analgesia": null,
					"Mood": null
				}
			},
			"Intimacy/Sex": {
				"Self": null,
				"Partner": null,
				"Other": null
			},
			"Talking": {
				"Family": {
					"Exhausting": null,
					"Slurred": null,
					"Embarrassing": null,
					"Hard to understand": null
				},
				"Friends": {
					"Exhausting": null,
					"Slurred": null,
					"Embarrassing": null,
					"Hard to understand": null
				},
				"Public": {
					"Exhausting": null,
					"Slurred": null,
					"Embarrassing": null,
					"Hard to understand": null
				},
				"Phone": {
					"Exhausting": null,
					"Slurred": null,
					"Embarrassing": null,
					"Hard to understand": null
				}
			},
			"Work": {
				"Ability": null,
				"Desire": null,
				"Need": null
			}
		}

		this.onComplete = this.onComplete.bind(this);
	}

	onComplete(labels, ratios, severity) {
		this.setState({
			results: this.state.results.concat({path: this.state.targetLevel, labels, ratios, severity}),
			furtherInput: true
		});
	}

	render() {
		if (!this.state.finished) {
			if (this.state.furtherInput) {
				// Last result
				var last_result = this.state.results.slice(-1)[0];
				var top_result = this.state.results.slice(-2)[0];
				// Find the proportions between those choices
				var largest_result = Math.max(...last_result.ratios);

				var proportions = last_result.ratios.map(val => val/largest_result);

				var most_significant_labels = filter(last_result.labels, (label, idx) => 
					// Needs to be both
					// a) within the threshhold
					proportions[idx] > 0.6 &&
					// b) actually have subcategories
					property(this.state.targetLevel ? `${this.state.targetLevel}.${label}` : label)(this.descriptors)
				);

				return (
					<div className="magic-triangle">
						{top_result && top_result != last_result && 
							<MagicTriangleStage title="Overview" descriptors={top_result.labels} ratios={top_result.ratios} severity={top_result.severity} disabled />}
						<MagicTriangleStage title={this.state.targetLevel.includes('.') ? this.state.targetLevel.split('.').slice(-2)[0] : 'Overview'} descriptors={last_result.labels} ratios={last_result.ratios} severity={last_result.severity} disabled />
						<div className="-mt-stage current">
						{most_significant_labels.length >= 1 &&
							<p>Choose a descriptor to expand on:</p>}
						{most_significant_labels.map(label =>
							<p key={label}><button className="preferred" onClick={_ => this.setState({
								targetLevel: (this.state.targetLevel ? this.state.targetLevel+'.' : '') + label,
								furtherInput: false
							})}>{label}</button></p>)
						}
						</div>
						<p style={{clear:'both'}}><button onClick={(e) => this.setState({finished: true})}>I'm finished</button></p>
					</div>
				);
			}
			else {
				var descriptors = keys(this.state.targetLevel ? property(this.state.targetLevel)(this.descriptors) : this.descriptors);

				var above      = this.state.results.slice(-1)[0];
				var aboveabove = this.state.results.slice(-2)[0];
				
				return (
					<div className="magic-triangle">
						{aboveabove && aboveabove != above &&
							<MagicTriangleStage title="Overview" descriptors={aboveabove.labels} ratios={aboveabove.values} severity={aboveabove.severity} disabled />
						}
						{above &&
							<MagicTriangleStage title={this.state.targetLevel.includes('.') ? this.state.targetLevel.split('.').slice(-2)[0] : 'Overview'} descriptors={above.labels} ratios={above.ratios} severity={above.severity} disabled />
						}
						<MagicTriangleStage title={this.state.targetLevel.split('.').slice(-1)[0]} descriptors={descriptors} onComplete={this.onComplete} />
					</div>
				);
			}
		}
		else {
			var plotResult = r => <TernaryPlot className="completed" disabled values={r.ratios} labels={r.labels} />;

			// Render finished overview
			// Level 1
			return (
				<div>
					{this.state.results.filter(r => !r.path).map(r1 => {
						return (
							<div key={r1}>
								<h3>{r1.path}</h3>
								{plotResult(r1)}
								{this.state.results.filter(r => keys(this.descriptors).includes(r.path)).map(r2 => {
									return (
										<div key={r2}>
											<h4>{r2.path}</h4>
											{plotResult(r2)}
										</div>
									);
								})}
							</div>
						);
					})}
				</div>
			);
		}
	}
}

document.addEventListener("DOMContentLoaded", (e) =>
	ReactDOM.render(<MagicTriangle />, document.getElementById('magicTriangle')));
