import { combineReducers } from "redux";
import results from "./results";
import gui     from "./gui";

export default combineReducers({
	results,
	gui,
});
