var mongoose = require('mongoose');

var replySchema = new mongoose.Schema({
    route_id: String,
    tag: String,
    text: String,
    positive_always_branch: String,
    negative_branch: String
});

replySchema.methods.getAlwaysBranch = function(callback) {
    if (this.negative_branch) return callback('Reply has a negative branch set');
    this.model('reply').findOne({route_id: this.route_id, tag: this.positive_always_branch}, function(err, result) {
        callback(err, result);
    });
};

replySchema.methods.getBranchByScore = function (score, callback) {
    var branch_tag = (score >= 0) ? this.positive_always_branch : this.negative_branch;
    this.model('reply').findOne({route_id: this.route_id, tag: branch_tag}, function(err, result) {
        callback(err, result);
    });
};

replySchema.methods.getNext = function(callback) {
    this.model('reply').findOne({_id: {$gt: this._id}}, function(err, result) {
        callback(err, result);
    });
};

var csv = require('csv');
replySchema.statics.importCsv = function(filename) {
    var that = this;
    csv().from.path(filename, {columns: true}).to.array(function(data, count) {
        that.remove({}, function(err) {
            console.log('Cleared old replies');
            for (var i=0; i<data.length; i++) {
                console.log('Inserting reply #' + (i+1) + ' of ' + data.length);
                var reply = new that(data[i]);
                reply.save();
            }
        });
    });
};

replySchema.statics.getRouteStart = function(route, callback) {
    this.findOne({route_id: route}, function(err, result) {
        callback(err, result);
    });
};

module.exports = mongoose.model('reply', replySchema);
