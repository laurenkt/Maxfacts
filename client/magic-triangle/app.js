import React from "react";
import ReactDOM from "react-dom";
import { createStore } from "redux";
import { Provider, connect } from "react-redux";
import reducer from "./reducers/index.js";
import { addResult } from "./reducers/results.js";
import Set from "./components/set.js";

let store = createStore(reducer);

const getRootResults = results => results.filter(r => typeof r.get("parent_id") === "undefined");

const mapStateToProps = ({results}) => {
	return {
		results: getRootResults(results),
	};
};

const mapDispatchToProps = {
	onClick: addResult,
};

const MagicTriangle = connect(mapStateToProps, mapDispatchToProps)(({results, onClick}) => {
	return (
		<div>
			<div className="magic-triangle">
					{results.map(r => <Set key={r.id} root={r.id} />)}
			</div>
			<p><a href="#" onClick={onClick}>Button</a></p>
		</div>
	);
});

document.addEventListener("DOMContentLoaded", _ => {
	ReactDOM.render(<Provider store={store}><MagicTriangle /></Provider>, document.getElementById("magicTriangle"));
});
