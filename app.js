// development only
/**
 * Module dependencies.
 */

var express = require('express');

var routes = require('./routes');
var auth = require('./routes/auth');
var http = require('http');
var path = require('path');

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

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
var sentiment = require('sentiment');

SmsService.on('message', function(message) {
    var number = message.phone_number;
    var text = message.message_text;
    console.log('Incoming message from ', number, text);
    sentiment(text, function(err, result) {
        var score = result.score;
        UserModel.findOne({number: number}, function(err, user) {
            ReplyModel.findOne(user.current, function(err, currentReply) {
                currentReply.getBranchByScore(score, function(err, branchReply) {
                    SmsService.sms(number, branchReply.text, function(err) {
                        user.current = {
                            route_id: branchReply.route_id,
                            tag: branchReply.tag
                        };
                        user.save(function(err) {

                        });
                    });
                });
            });
        });
    });
});

SmsService.init(function() {
    console.log('app.js', 'SmsService init');
});

ReplyModel.importCsv(path.join(__dirname, 'replies.csv'));
