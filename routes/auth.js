var passport = require('passport');
var GoogleStrategy = require('passport-google').Strategy;
var User = require('../userModel');
var config = require('../config');

passport.use(new GoogleStrategy({
//    clientID: config.GOOGLE_CLIENTID,
//    clientSecret: config.GOOGLE_CLIENTSECRET,
    returnURL: (process.env.NODE_ENV == 'production') ? 'http://frankenstein-interactive.herokuapp.com/auth/callback' : 'http://localhost:3000/auth/callback',
    realm: 'http://localhost:3000/'
}, function(identifier, profile, done) {
    User.findOrCreate(identifier, profile, function(err, user) {
        console.log(user);
        done(null, user);
    });
}));

passport.serializeUser(function(user, done) {
    done(null, user.profileId);
});

passport.deserializeUser(function(profileId, done) {
    User.findOne({profileId: profileId}, function(err, user) {
        done(err, user);
    });
});

exports.login = passport.authenticate('google', {scope: "email"});

exports.loginCallback = passport.authenticate('google', {
    successRedirect: '/',
    failureRedirect: '/'
});

exports.logout = function(req, res) {
    req.logout();
    res.redirect('/');
};
