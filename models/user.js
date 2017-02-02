import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
	email:          {type:String, required:true, unique:true},
	can_edit_users: {type:Boolean, default:false},
}, {
	timestamps: true,
});

UserSchema.statics = {
};

UserSchema.methods = {
};

export default mongoose.model("User", UserSchema);
