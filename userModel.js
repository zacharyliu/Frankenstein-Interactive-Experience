var mongoose = require('mongoose');

var userSchema = new mongoose.Schema({
    profileId: String,
    displayName: String,
    email: String,
    number: String,
    current: {
        route_id: String,
        tag: String
    },
    completedRoutes: [String],
    messages: [{
        date: Date,
        outgoing: Boolean,
        text: String
    }],
    activationKey: String
});

userSchema.statics.findOrCreate = function (identifier, profile, callback) {
    var that = this;
    console.log('userSchema.findOrCreate', identifier, profile);

    // try to check if user already exists
    that.findOne({profileId: identifier}, function (err, result) {
        if (!err && result) {
            // user already exists
            if(callback) callback(null, result);
        } else {
            // create a new user
            var user = new that({
                profileId: identifier,
                displayName: profile.displayName,
                email: profile.emails[0].value,
                activationKey: Math.floor(Math.random() * 899999) + 100000
            });
            user.save(function (err, user) {
                if (err && callback) return callback(err);
                if (callback) return callback(null, user);
            });
        }
    });
};

module.exports = mongoose.model('user', userSchema);
