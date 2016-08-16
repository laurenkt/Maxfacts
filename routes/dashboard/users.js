import express from "express";
import User from "../../models/user.js";

const router = express.Router();

router.get("/", (req, res) => {
	User.find().exec().then((users) =>
		res.render("dashboard/users", {users, layout: "layout-dashboard"}));
});

router.get("/new", (req, res) => {
	res.render("dashboard/user", {layout: "layout-dashboard"});
});

router.get("/edit/:id(*)", (req, res) => {
	User.findOne( { _id: req.params.id } ).then(user => {
		res.render("dashboard/user", {email:user.email, can_edit_users:user.can_edit_users, layout:"layout-dashboard"});
	});
});

router.post("/edit/:id(*)", (req, res) => {
	User.findOne( { _id: req.params.id } ).then(user => {
		user.email = req.body.email;
		user.can_edit_users = req.body.can_edit_users;

		if (req.body.password)
			return user.setHashFromPassword(req.body.password)
				.then(user.save);
		else
			return user.save();
	})
	.then(() => res.redirect("/dashboard/users"))
	.catch(console.error.bind(console));
});

router.post("/new", (req, res) => {
	var user = new User(req.body);

	if (req.body.password) {
		user.setHashFromPassword(req.body.password)
			.then(user.save)
			.then(() => res.redirect("/dashboard/users"))
			.catch(console.error.bind(console));
	}
	else {
		throw new Error("No password provided");
	}
});

module.exports = router;
