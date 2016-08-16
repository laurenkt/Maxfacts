import mongoose from "mongoose";
import bcrypt   from "bcrypt";

const bcryptSaltRounds = 10;

const UserSchema = new mongoose.Schema({
	email:          {type:String, required:true, unique:true},
	hash:           {type:String, required:true, maxlength:60, minlength:60},
	can_edit_users: {type:Boolean, default:false},
}, {
	timestamps: true,
});

UserSchema.statics = {
	generateHash(plaintext_password, salt_rounds) {
		return new Promise((resolve, reject) => {
			bcrypt.hash(plaintext_password, salt_rounds, (err, hash) => {
				if (err)
					reject(err);
				else
					resolve(hash);
			});
		});
	},

	compareHash(plaintext_password, hash) {
		return new Promise((resolve, reject) => {
			bcrypt.compare(plaintext_password, hash, (err, result) => {
				if (err)
					reject(err);
				else
					resolve(result);
			});
		});
	},
};

UserSchema.methods = {
	setHashFromPassword(plaintext_password) {
		return UserSchema.statics.generateHash(plaintext_password, bcryptSaltRounds)
			.then(hash => this.hash = hash);
	},

	doesPasswordMatchHash(plaintext_password) {
		return UserSchema.statics.compareHash(plaintext_password, this.hash);
	},
};

export default mongoose.model("User", UserSchema);
