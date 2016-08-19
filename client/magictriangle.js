import React    from "react";
import ReactDOM from "react-dom";
import Row      from "./magic-triangle/row.js";

class MagicTriangle extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			results: [],
		};

		this.onComplete = this.onComplete.bind(this);

		this.rows = [<Row key={0} onComplete={this.onComplete} />];
	}

	onComplete(result) {
		this.rows.push(<Row key={this.rows.length} onComplete={this.onComplete} />);
		this.setState({results: this.state.results.concat(result)});
	}

	render() {
		return <div>{this.rows}</div>;
	}
}

document.addEventListener("DOMContentLoaded", _ =>
	ReactDOM.render(<MagicTriangle />, document.getElementById("magicTriangle")));
