// development only
/**
 * Module dependencies.
 */

var express = require('express');

var routes = require('./routes');
var auth = require('./routes/auth');
var http = require('http');
var path = require('path');
var async = require('async');

var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/frankenstein');
var passport = require('passport');
var ReplyModel = require('./replyModel');
var UserModel = require('./userModel');
var SmsService = require('./smsService');

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.cookieParser());
app.use(express.bodyParser());
app.use(express.session({ secret: 'keyboard cat' }));
app.use(passport.initialize());
app.use(passport.session());
app.use(app.router);
app.use(require('less-middleware')({ src: path.join(__dirname, 'public') }));

app.use(express.static(path.join(__dirname, 'public')));
if ('development' == app.get('env')) {
    app.use(express.errorHandler());
}

app.get('/', routes.index);
app.get('/dashboard', routes.index);
app.get('/auth/login', auth.login);
app.get('/auth/callback', auth.loginCallback);

app.get('/auth/logout', auth.logout);

http.createServer(app).listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
});
var sentiment = require('sentiment');

SmsService.on('message', function (message) {
    var number = message.phone_number;
    var text = message.message_text;
    console.log('Incoming message from ', number, text);
    UserModel.findOne({number: number}, function (err, user) {
        if (err || !user) {
            // No user found, try to activate a new user
            UserModel.findOne({activationKey: text}, function (err, user) {
                if (!err) {
                    // Successful, activate
                    user.number = number;
                    user.save(function (err) {
                        SmsService.sms(number, 'Successfully activated you as user ' + user.email + '. The experience begins now...');

                        console.log('Starting experience');
                        var starting = {
                            route_id: 'introduction',
                            tag: 'a'
                        };
                        ReplyModel.findOne(starting, function(err, reply) {
                            user.current = starting;
                            user.save(function(err) {
                                SmsService.sms(number, reply.text, function(err) {

                                });
                            });
                        });
                    });
                } else {
                    // Unsuccessful, send error
                    SmsService.sms(number, 'Could not find that activation key, try again.');
                }
            })
        } else {
            // User exists, figure out what to do based on the incoming text and the user state
            if (user.current) {
                // Case 1: the user is currently on a route, and use the text to respond
                sentiment(text, function (err, result) {
                    var score = result.score;
                    ReplyModel.findOne(user.current, function (err, currentReply) {
                        currentReply.getBranchByScore(score, function (err, branchReply) {
                            collectReplyMessages(branchReply, function (err, finalReply, messages) {
                                // Send out SMS messages in order
                                async.mapSeries(messages, function (message, callback) {
                                    SmsService.sms(number, message, callback);
                                }, function (err, results) {
                                });

                                // Update user state
                                if (finalReply.positive_always_branch == '') {
                                    console.log('User completed route with id', finalReply.route_id);
                                    user.current = null;
                                    user.completedRoutes.push(finalReply.route_id);
                                } else {
                                    user.current = {
                                        route_id: finalReply.route_id,
                                        tag: finalReply.tag
                                    };
                                }
                                user.save(function (err) {
                                    console.log(err, user);
                                });
                            });

                        });
                    });
                });
            } else {

            }
        }
    });
});

function collectReplyMessages(reply, callback) {
    var messages = [];
    async.whilst(
        function () {
            [].push.apply(messages, reply.text.split('\n'));
            return (reply.positive_always_branch != '' && reply.negative_branch == '');
        },
        function (callback) {
            reply.getAlwaysBranch(function (err, branch) {
                reply = branch;
                callback();
            });
        },
        function (err) {
            callback(err, reply, messages);
        }
    );
}

SmsService.init(function () {
    console.log('app.js', 'SmsService init');
});

ReplyModel.importCsv(path.join(__dirname, 'replies.csv'));
