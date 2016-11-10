import express from "express";
import passport from "passport";
import { Strategy } from "passport-google-oauth20";

const router = express.Router();

passport.use(new Strategy({
	clientID:     "374535397413-efev3hqdb8p7lprvjcp9h2bp3cpvnd5n.apps.googleusercontent.com",
	clientSecret: "ZsuO8H9cLXvDUfieYLkUDHiT",
	callbackURL:  "http://localhost:3000/dashboard/auth/callback"
},
function(accessToken, refreshToken, profile, cb) {
	const email = profile.emails[0].value;
	cb(null, email);
}
));

router.get("/auth", passport.authenticate('google', { scope: ['email'] } ));
router.get("/auth/callback",
  passport.authenticate('google', { failureRedirect: '/error' }),
  function(req, res) {
    // Successful authentication, redirect home.
	  res.redirect("/dashboard");
  });

router.use("/users",     require("./dashboard/users.js"));
router.use("/images",    require("./dashboard/images.js"));
router.use("/directory", require("./dashboard/directory.js"));

router.get("/", (req, res) => {
	console.log(req.user);
	res.render("dashboard/overview", {layout: "layout-dashboard"});
});

module.exports = router;
