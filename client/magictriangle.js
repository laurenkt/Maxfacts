import React    from "react";
import ReactDOM from "react-dom";
import Row      from "./magic-triangle/row.js";

class MagicTriangle extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			results: [],
			finished: false,
		};

		this.onComplete = this.onComplete.bind(this);

		this.rows = [<Row key={0} onComplete={this.onComplete} />];
	}

	onComplete(result) {
		if (result != []) {
			this.rows.push(<Row key={this.rows.length} onComplete={this.onComplete} optional />);
			this.setState({results: this.state.results.concat(result)});
		}
		else
			this.setState({finished:true});
	}

	render() {
		return (
			<div>
				{this.rows}
				{this.state.finished &&
					<p>Finished</p>}
			</div>
		);
	}
}

document.addEventListener("DOMContentLoaded", _ =>
	ReactDOM.render(<MagicTriangle />, document.getElementById("magicTriangle")));
