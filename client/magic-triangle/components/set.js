import React       from "react";
import { connect } from "react-redux";
import Cell      from "./cell";
import descriptors from "../descriptors.json";
import { addResultToParent } from "../reducers/results";
import ReactCSSTransitionGroup from "react/lib/ReactCSSTransitionGroup";

const getResultTree = (results, root) => {
	const denormalize = node => ({
		...node,
		children: node.children.map(id => denormalize(results[id])),
	});

	return denormalize(results[root]);
};

const mapStateToProps = (state, ownProps) => ({
	root: getResultTree(state.results, ownProps.root),
	context: descriptors,
});

const mapDispatchToProps = (dispatch) => ({
	onLabelClick: parent => label => dispatch(addResultToParent(parent, label)),
	onRemove:     id => dispatch(removeResult(id)),
});

const Set = ({ root, context, onLabelClick, onRemove }) =>
	<section className="mt-set">
		<Cell {...root} context={context} onLabelClick={onLabelClick(root.id)} />
		<div className="mt-children">
			<ReactCSSTransitionGroup transitionName="mt-set"
				transitionLeaveTimeout={1000} transitionEnterTimeout={1000}>
			{root.children.map(child =>
				<Set key={child.id} root={child} context={context[child.title]}
					onLabelClick={onLabelClick} onRemove={() => onRemove(child.id)} />)}
			</ReactCSSTransitionGroup>
		</div>
	</section>;

Set.propTypes = {
	root: React.PropTypes.object,
	context: React.PropTypes.object,
	onLabelClick: React.PropTypes.func,
};

export default connect(mapStateToProps, mapDispatchToProps)(Set);

/*
export default class Set extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			results:   [],
			finished:  false,
		};

		this.onComplete = this.onComplete.bind(this);
	}

	static get contentTypes() {

	}

	static get propTypes() {
		return {
			onComplete: React.PropTypes.func,
			optional:   React.PropTypes.bool,
		};
	}

	onComplete(title, labels, ratios, severity) {
		var results = this.state.results;
		let finished = false;

		// Don't add another result unless a title has been passed in.
		// If this has been called as a result of a cancellation there will be no
		// title.
		if (typeof title != "undefined") {
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
		}
		else
			finished = true;

		if (finished && this.props.onComplete)
			this.props.onComplete(results);

		this.setState({results, finished});
	}

	renderColumns() {
		return (
			<div key="cols" className="mt-row-unfinished">
				<div className="magic-triangle">
					<Column onAddChild={console.log.bind(console)} context={descriptors} onComplete={this.onComplete} />
					{this.state.results.length > 0 &&
						<Column onAddChild={console.log.bind(console)} onComplete={this.onComplete} onCancel={this.onComplete}
							context={pick(descriptors, this.state.results[0].labels)} />}
					{this.state.results.length > 1 &&
						<Column onComplete={this.onComplete} onCancel={this.onComplete}
							context={pick(descriptors[this.state.results[1].title], this.state.results[1].labels)} />}
				</div>
				{this.props.optional &&
					<div>
						<p className="notice">If you don't want to answer any more questions, click below to finish the questionnaire.</p>
						<button className="accent" onClick={_ => this.onComplete()}>I'm done</button>
					</div>}
			</div>
		);
	}

	renderFinished() {
		if (this.state.results.length == 0)
			return;

		const strongIf = (str, cond) =>
			cond ? `<strong>${str}</strong>` : str;
		const formatSelected = result_title => // curried
			label => strongIf(label, label == result_title);
		const vsStringForIndex = idx =>
			"<span class=\"column\">" +
			this.state.results[idx].labels.map(formatSelected(this.state.results[idx+1] && this.state.results[idx+1].title)).join(" <small>vs</small> ") +
			"</span>";

		return (
			<p className="mt-row-finished" dangerouslySetInnerHTML={{
				__html: 
					vsStringForIndex(0)
					+ (this.state.results[1] ? ` &rarr; ${vsStringForIndex(1)}` : "")
					+ (this.state.results[2] ? ` &rarr; ${vsStringForIndex(2)}` : ""),
			}} />
		);
	}

	render() {
		return (
			<div>
				<ReactCSSTransitionGroup transitionName="mt-row-unfinished"
					transitionLeaveTimeout={400} transitionEnterTimeout={0}>
					{!this.state.finished &&
						this.renderColumns() }
				</ReactCSSTransitionGroup>
				<ReactCSSTransitionGroup transitionName="mt-row-finished"
					transitionEnterTimeout={400} transitionLeaveTimeout={0}>
					{this.state.finished &&
						this.renderFinished() }
				</ReactCSSTransitionGroup>
			</div>
		);
	}
}*/
