import React    from "react";
import Column from "./column";
import descriptors from "./descriptors.json";
import {pick,some} from "lodash";

export default class Row extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			results:   [],
			finished:  false,
		};

		this.onComplete = this.onComplete.bind(this);
	}

	static get propTypes() {
		return {
			onComplete:  React.PropTypes.func,
		};
	}

	onComplete(title, labels, ratios, severity) {
		var results = this.state.results;
		let finished = false;

		// Update results with new information
		results.push({title, labels, ratios, severity});

		// Past the first depth level we need to consider whether it's actually possible
		// for the user to continue any further
		if (results.length > 1) {
			// Only proceed to the next depth if there will actually be more
			let next_labels = results.slice(1).reduce(
				(last_labels, current) => last_labels[current.title],
				descriptors);

			// Only go to next depth if there is a non-null label available
			finished = !some(next_labels, label => label != null);
		}

		if (finished && this.props.onComplete)
			this.props.onComplete(results);

		this.setState({results, finished});
	}

	render() {
		if (!this.state.finished) {
			return (
				<div className="magic-triangle">
					<Column context={descriptors} onComplete={this.onComplete} />
					{this.state.results.length > 0 &&
						<Column onComplete={this.onComplete}
							context={pick(descriptors, this.state.results[0].labels)} />}
					{this.state.results.length > 1 &&
						<Column onComplete={this.onComplete}
							context={pick(descriptors[this.state.results[1].title], this.state.results[1].labels)} />}
					{this.state.results.length < 1 &&
						<aside className="walkthrough">
							<p>This seems like a good location to have the step-through guide for the magic triangle.</p>
							<p>It doesn't get in the way of people who already know what they're doing, but it's right
								alongside for people who don't.</p>
						</aside>}
				</div>
			);
		}
		else {
			return <p>{this.state.results.map(r => r.labels.join(", ")).join(" → ")}</p>;
		}
	}
}
