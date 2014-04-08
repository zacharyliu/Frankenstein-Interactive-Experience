var config = require('../config');

exports.index = function (req, res) {
    console.log(req.user);
    res.render('home', {
        title: 'Express',
        isLoggedIn: !!req.user,
        user: req.user,
        masterNumber: config.NUMBER
    });
};