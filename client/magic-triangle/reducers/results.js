import { Map, fromJS } from "immutable";

let lastResultId = 0;

const scaffold = () => fromJS({
	id:       lastResultId,
	labels:   [],
	selected: [],
	ratios:   undefined,
	severity: undefined,
	children: [],
});

const initialState = Map({}).set(lastResultId, scaffold());

export default function results(state = initialState, action) {
	console.log("ACTION", action);
	switch (action.type) {
		case "COPY_RESULT":
			var newId = ++lastResultId;
			var new_state = state
				.set(newId, state.get(action.id))
				.setIn([newId, "id"], newId)
				.setIn([newId, "children"], fromJS([]));

			if (new_state.hasIn([action.id, "parent"])) {
				var parentId = lastResultId+1;
				new_state = results(new_state, copyResult(new_state.getIn([action.id, "parent"])))
					.setIn([newId, "parent"], parentId)
					.setIn([parentId, "children"], fromJS([newId]));
			}

			return new_state;

		case "ADD_RESULT":
			lastResultId++;
			return state.set(lastResultId, scaffold());

		case "ADD_RESULT_TO_PARENT":
			// Only do this if there isn't one there already
			if (state.some(result => results.parent === action.parent && result.title === action.title))
				return state;

			return results(state, addResult())
				.mergeIn([lastResultId], {parent:action.parent, title:action.title, origin:action.click_coords})
				.setIn([action.parent, "children"], fromJS([lastResultId]));

		case "UPDATE_RESULT":
			return state
				.mergeIn([action.id], 
					fromJS({ratios:action.ratios, severity:action.severity, selected:action.selected})
					.filterNot(val => typeof val === "undefined"));

		case "REMOVE_RESULT":
			// Skip this if already deleted (e.g. if the user clicks delete again whilst it
			// transitions out)
			if (!state.has(action.id))
				return state;

			return state
			// Update its parent (remove it as a child)
				.updateIn([state.getIn([action.id, "parent"]), "children"], children =>
					children.filter(id => id != action.id))
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

export const copyResult = id => ({
	type: "COPY_RESULT",
	id,
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

export const updateResult = (id, state) => ({
	...state,
	type: "UPDATE_RESULT",
	id,
});
