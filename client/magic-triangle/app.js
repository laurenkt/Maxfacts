import React from "react";
import ReactDOM from "react-dom";
import { createStore } from "redux";
import { Provider, connect } from "react-redux";
import reducer from "./reducers/index.js";
import { addResult } from "./reducers/results.js";
import Set from "./components/set.js";

let store = createStore(reducer);

const getRootResults = results =>
	results.filter(r => !r.has("parent"));

const mapStateToProps = ({results}) => {
	return {
		results: getRootResults(results),
	};
};

const mapDispatchToProps = {
	onClick: addResult,
};

const MagicTriangle = connect(mapStateToProps, mapDispatchToProps)(({results, onClick}) =>
	<div>
		<div className="magic-triangle">
			{results.valueSeq().map(r => <Set key={r.get("id")} root={r.get("id")} />)}
		</div>
		<p><button className="accent" onClick={onClick}>Add Another</button></p>
	</div>
);

document.addEventListener("DOMContentLoaded", _ => {
	ReactDOM.render(<Provider store={store}><MagicTriangle /></Provider>, document.getElementById("magicTriangle"));
});
