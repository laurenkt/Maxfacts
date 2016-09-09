import { Map, fromJS } from "immutable";

const initialState = Map({finished: false});

export default function gui(state = initialState, action) {
	console.log("ACTION", action);
	switch (action.type) {
		case "FINISH_QUIZ":
			return state.set("finished", true);

		default:
			return state;
	}
}
// Actions

export const finishQuiz = () => ({
	type: "FINISH_QUIZ",
});
