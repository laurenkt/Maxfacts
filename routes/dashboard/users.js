import express from "express";
import User from "../../models/user.js";

const router = express.Router();

router.get("/", (req, res) => {
	User.find().exec().then((users) =>
		res.render("dashboard/users", {users, layout: "dashboard"}));
});

router.get("/new", (req, res) => {
	res.render("dashboard/user", {layout: "dashboard"});
});

router.get("/edit/:id(*)", (req, res) => {
	User.findOne( { _id: req.params.id } ).then(user => {
		res.render("dashboard/user", {email:user.email, can_edit_users:user.can_edit_users, layout:"dashboard"});
	});
});

router.post("/edit/:id(*)", (req, res) => {
	User.findOne( { _id: req.params.id } ).then(user => {
		user.email = req.body.email;
		user.can_edit_users = req.body.can_edit_users;
		return user.save();
	})
	.then(() => res.redirect("/dashboard/users"))
	.catch(console.error.bind(console));
});

router.post("/new", (req, res) => {
	const user = new User(req.body);
	user.save()
		.then(() => res.redirect("/dashboard/users"))
		.catch(console.error.bind(console));
});

module.exports = router;
