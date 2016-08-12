import React    from "react";
import ReactDOM from "react-dom";
import MTStage from "./MTStage";
import TernaryPlot from "./ternaryplot";
import descriptors from "./descriptortree";
import {keys,pick} from "lodash";

class MTController extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			results: [],
			targetLevel: "",
			finished: false,
		};

		this.onComplete = this.onComplete.bind(this);
	}

	onComplete(title, labels, ratios, severity) {
		this.setState({
			results: this.state.results.concat({title, labels, ratios, severity}),
		});
	}

	render() {
		if (!this.state.finished) {
			return (
				<div className="magic-triangle">
					<MTStage context={descriptors} onComplete={this.onComplete} />
					{this.state.results.length > 0 &&
						<MTStage onComplete={this.onComplete}
							context={pick(descriptors, this.state.results[0].labels)} />}
					{this.state.results.length > 1 &&
						<MTStage onComplete={this.onComplete}
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
								{this.state.results.filter(r => keys(descriptors).includes(r.path)).map(r2 => {
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

document.addEventListener("DOMContentLoaded", _ =>
	ReactDOM.render(<MTController />, document.getElementById("magicTriangle")));
