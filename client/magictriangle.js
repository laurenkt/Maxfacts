import React    from 'react';
import ReactDOM from 'react-dom';
import MagicTriangleStage from './magictrianglestage';
import TernaryPlot from './ternaryplot';
import {keys, filter,
	property} from 'lodash';

class MagicTriangle extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			results: [],
			targetLevel: null,
			furtherInput: false
		}

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

	onComplete(labels, relationship, severity) {
		this.setState({
			results: this.state.results.concat({labels, relationship, severity}),
			furtherInput: true
		});
	}

	render() {
		if (this.state.furtherInput) {
			// Last result
			var last_result = this.state.results.slice(-1)[0];
			// Find the proportions between those choices
			var largest_result = Math.max(...last_result.relationship);

			var proportions = last_result.relationship.map(val => val/largest_result);

			var most_significant_labels = filter(last_result.labels, (label, idx) => 
				// Needs to be both
				// a) within the threshhold
				proportions[idx] > 0.6 &&
				// b) actually have subcategories
				property(this.state.targetLevel ? `${this.state.targetLevel}.${label}` : label)(this.descriptors)
			);

			return (
				<div>
					<p>This is what you told us:</p>
					<TernaryPlot className="completed" disabled a={last_result.relationship[0]}
						b={last_result.relationship[1]} c={last_result.relationship[2]} labels={last_result.labels} />
					{most_significant_labels.length >= 1 &&
						<p>Would you like to tell us more?</p>}
					{most_significant_labels.map(label =>
						<p key={label}><button className="preferred" onClick={_ => this.setState({
							targetLevel: (this.state.targetLevel ? this.state.targetLevel+'.' : '') + label,
							furtherInput: false
						})}>Tell us more about <strong>{label}</strong></button></p>)
					}
					<p><button onClick={(e) => this.setState({furtherInput: false})}>I'm finished</button></p>
				</div>
			);
		}
		else {
			var descriptors = keys(this.state.targetLevel ? property(this.state.targetLevel)(this.descriptors) : this.descriptors);

			return <MagicTriangleStage descriptors={descriptors} onComplete={this.onComplete} />;
		}
	}
}

document.addEventListener("DOMContentLoaded", (e) =>
	ReactDOM.render(<MagicTriangle />, document.getElementById('magicTriangle')));
