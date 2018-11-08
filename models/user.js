import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
	email:          {type:String, required:true, unique:true},
	can_edit_users: {type:Boolean, default:false},
}, {
	timestamps: true,
});

UserSchema.statics = {
	doesUserExist(email) {
		return this.model("User").findOne({email}).exec().then(email => email != null);
	}
};

UserSchema.methods = {
};

export default mongoose.model("User", UserSchema);
