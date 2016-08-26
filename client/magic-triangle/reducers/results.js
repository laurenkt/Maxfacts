import { Map } from "immutable";

let lastResultId = 0;

const initialState = Map({});

export default function results(state = initialState, action) {
	const scaffold = () => ({
		id:       lastResultId,
		labels:   [],
		selected: [],
		ratios:   [0.3333, 0.3333, 0.3333],
		severity: 0.5,
		children: [],
	});

	switch (action.type) {
		case "ADD_RESULT":
			lastResultId++;
			return state.set(lastResultId, scaffold());
		case "ADD_RESULT_TO_PARENT":
			lastResultId++;
			return state
				.set(lastResultId, scaffold())
				.setIn([lastResultId, "parent"], action.parent)
				.updateIn([action.parent, "children"], children => children.push(lastResultId));
		case "REMOVE_RESULT":
			return state
			// Update its parent
				.updateIn([state.getIn([action.id, "parent"]), "children"], children => children.filter(id => id != action.id))
			// Remove its children
				.filter(item => item.parent != action.id)
			// Then remove the element
				.remove(action.id);
		default:
			return state;
	}
}
// Actions

export const addResult = () => ({
	type: "ADD_RESULT",
});

export const addResultToParent = (parent, title) => ({
	type: "ADD_RESULT_TO_PARENT",
	title,
	parent,
});

export const removeResult = id => ({
	type: "REMOVE_RESULT",
	id,
});
