var util = require("util");
var crypto = require("crypto");
var _ = require("lodash");

var shlog = require(global.C.BASE_DIR + "/lib/shlog.js");
var sh = require(global.C.BASE_DIR + "/lib/shutil.js");
var dispatch = require(global.C.BASE_DIR + "/lib/shdispatch.js");
var stats = require(global.C.BASE_DIR + "/lib/shstats.js");

function ShRes() {
  this.msgs = [];
  this.notifs = [];
  this.batch = false;
  this.ws = null;
  this.req = null;

// res.add - adds event or error to output stream
  this.add = function(data) {
    if (_.isUndefined(this.msgs)) {
      this.msgs = [];
    }
    if (this.req.body._pt) {
      data._pt = this.req.body._pt;
    }
    if (data.event === "error") {
      data.inputs = this.req.body;
      stats.incr("errors", "socket");
      shlog.error("socket", "send %j", data);  // log all errors
    }
    this.msgs.push(data);
  }

// res.sendAll - sends all events or errors
// currently we pass each message on socket, not the array
// SWD: should test if sending all at once is better for socket layer
  this.sendAll = function() {
    if (this.batch) {
      this.send(this.msgs);
    } else {
      var self = this;
      _.each(this.msgs, function (data) {
        sh.sendWs(self.ws, data);
      });
    }
    this.msgs = [];
  }

// res.notify - queues the socket messages so we can make them after save
  this.notify = function(uids, data, excludeIds) {
    if (_.isUndefined(this.notifs)) {
      this.notifs = [];
    }
    this.notifs.push({uids: uids, data: data, excludeIds: excludeIds});
  }

  this.notifyAll = function() {
    _.each(this.notifs, function (obj) {
      dispatch.sendUsers(obj.uids, obj.data, obj.excludeIds, function (err, data) {
        // don't care
      });
    });
    this.notifs = [];
  }

  this.clear = function() {
    this.msgs = [];
    this.notifs = [];
  }
}

module.exports = ShRes;