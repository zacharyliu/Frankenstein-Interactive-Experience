var voicejs = require('voice.js');
var config = require('../config');
var util = require('util');
var events = require('events');

var SmsService = function () {
    this.client = new voicejs.Client({
        email: config.GOOGLE_USERNAME,
        password: config.GOOGLE_PASSWORD
    });
};

util.inherits(SmsService, events.EventEmitter);

SmsService.prototype.sms = function (to, text, callback) {
    if (this.client) {
        console.log('SmsService sending message "' + text + '" to ' + to);
        this.client.sms({to: to, text: text}, function(err, res, data) {
            if (callback) callback(null, data);
        });
    } else {
        callback('SMS client not yet initialized');
    }
};

SmsService.prototype.init = function (callback) {
    var that = this;

    that.client = new voicejs.Client({
        email: config.GOOGLE_USERNAME,
        password: config.GOOGLE_PASSWORD
    });

    // This fn will monitor token events until all 3 tokens are retrieved.
    // When all three are retrieved, they will be saved to tokens.json
    function newToken() { // check if the client has all the tokens
        var allRetrieved = true;
        var tokens = that.client.getTokens();

        ['auth', 'gvx', 'rnr'].forEach(function (type) {
            if (!tokens.hasOwnProperty(type)) {
                allRetrieved = false;
            }
        });

        if (allRetrieved) { // save tokens once all have been retrieved
            console.log('All tokens retrieved');
            that._loopInterval = setInterval(function() {
                that._fetchNewMessages()
            }, 5000);
            if (callback) callback(null);
        }
    }


    // Whenever a NEW token is retrieved, the corresponding event is emitted.
    // Note: These events are only emitted when the newly-retrieved token is CHANGED or NEW.
    that.client.on('auth', newToken);
    that.client.on('gvx', newToken);
    that.client.on('rnr', newToken);


    // Get an auth token
    that.client.auth(function (err, token) {
        if (err) {
            if (callback) callback(err);
            return console.log('.auth error: ', err);
        }

        console.log('New auth token:', token);
    });

    // Get an rnr token
    that.client.rnr(function (err, token) {
        if (err) {
            if (callback) callback(err);
            return console.log('.rnr error: ', err);
        }

        console.log('New rnr token:', token);
    });

    // Get a gvx token
    that.client.gvx(function (err, token) {
        if (err) {
            if (callback) callback(err);
            return console.log('.gvx error: ', err);
        }

        console.log('New gvx token:', token);
    });
};

SmsService.prototype._fetchNewMessages = function () {
    var that = this;
    that.client.get('sms', {limit: 5}, function (error, response, data) {
        if (error) {
            return console.log(error);
        }

        if (!data || !data.conversations_response || !data.conversations_response.conversationgroup) {
            return console.log('No new messages');
        }

        var new_message_count = 0;
        data.conversations_response.conversationgroup.forEach(function (convo) {
            if (convo.conversation.status == 0) {
                new_message_count++;

                // get the new message in the conversation
                // TODO: allow more than one new message
                var message = convo.call[convo.call.length - 1];
                that.emit('message', message);

                // mark as read
                that.client.set('mark', {id: convo.conversation.id, read: true}, function(err, res, data) {
                    console.log('Marked conversation ' + convo.conversation.id + ' as read');
                })
            }
        });

        return console.log(new_message_count + ' new message(s)');
    });
};

module.exports = new SmsService();
