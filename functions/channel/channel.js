var cluster = require("cluster");
var _ = require("lodash");

var shlog = require(global.gBaseDir + "/src/shlog.js");
var sh = require(global.gBaseDir + "/src/shutil.js");
var dispatch = require(global.gBaseDir + "/src/dispatch.js");

var Channel = exports;

Channel.desc = "game state and control module";
Channel.functions = {
  add: {desc: "add this user to the channel", params: {channel: {dtype: "string"}}, security: []},
  remove: {desc: "remove this user from the channel", params: {channel: {dtype: "string"}}, security: []},
  send: {desc: "send a message to all users on channel", params: {channel: {dtype: "string"}, message: {dtype: "string"}}, security: []},
  list: {desc: "list users on channel", params: {channel: {dtype: "string"}}, security: []}
};

var channelDef = {
  user: {persist: true, maxEvents: 50},
  lobby: {persist: true, maxEvents: 50},
  games: {persist: true, maxEvents: 50}
};

Channel.list = function (req, res, cb) {
  global.db.smembers(req.body.channel, function (err, data) {
    if (err) {
      res.add(sh.error("channel-list", err, data));
      return cb(1);
    }
    res.add(sh.event("channel.list", data));
    return cb(0);
  });
};

Channel.add = function (req, res, cb) {
  shlog.info("channel.add: ", req.body.channel, req.session.uid);

  if (_.isUndefined(res.ws)) {
    res.add(sh.error("call-bad", "this call can only be made from the socket interafce"));
    return cb(1);
  }

  global.db.sadd(req.body.channel, req.session.uid, function (err, data) {
    if (err) {
      res.add(sh.error("channel-add", data));
      return cb(1);
    }
    res.add(sh.event("channel.add", data));
    res.ws.channels[req.body.channel] = "on";  // cross ref so we can call remove on socket close

    // notify me and the channel users that I'm on
    var event = sh.event("channel.user", {channel: req.body.channel, uid: req.session.uid,
      name: req.session.user.get("name"),
      pict: req.session.user.get("pict"),
      gender: req.session.user.get("gender"),
      age: req.session.user.get("age"),
      status: "on"});
    Channel.sendInt(req.body.channel, event, function (err, locateList) {
      // send me a list of current users
      _.each(locateList, function (locateInfo, uid) {
        var event = sh.event("channel.user", {channel: req.body.channel, uid: uid,
          name: locateInfo.name,
          pict: locateInfo.pict,
          gender: locateInfo.gender,
          age: locateInfo.age,
          status: "on"});
        res.add(event);
      });

      // send back any messages on the channel
      req.loader.get("kMessageBank", req.body.channel, function (err, ml) {
        if (!err) {
          res.add(sh.event("channel.message", {channel: req.body.channel, bank: ml.get("bank")}));
        }
        return cb(0);
      });
    });
  });
};

Channel.removeInt = function (channel, uid, cb) {
  shlog.info("removeInt: ", channel, uid);

  global.db.srem(channel, uid, function (err, data) {
    // ignore the error and just send the off
    global.db.smembers(channel, function (err, data) {
      var event = sh.event("channel.user", {channel: channel, uid: uid, status: "off"});
      dispatch.sendUsers(data, event);
      if (_.isFunction(cb)) {
        return cb(0, event);
      }
    });
  });
};

Channel.remove = function (req, res, cb) {
  shlog.info("channel.remove: ", req.body.channel, req.session.uid);

  if (_.isUndefined(res.ws)) {
    res.add(sh.error("call-bad", "this call can only be made from the socket interafce"));
    return cb(1);
  }

  Channel.removeInt(req.body.channel, req.session.uid, function (err, event) {
    if (err) {
      res.add(sh.error("channel-remove", "unable to remove user from channel"));
      return cb(1);
    }
    res.add(event);
    return cb(0);
  });
};

Channel.sendInt = function (channel, event, cb) {
  global.db.smembers(channel, function (err, uidList) {
    if (err) {
      return cb(1);
    }

    dispatch.sendUsers(uidList, event, null, function (err, locateList) {
      if (_.isFunction(cb)) {
        return cb(0, locateList);
      }
    });
  });
};

Channel.send = function (req, res, cb) {
  shlog.info("channel.message: ", req.body.channel, req.body.message);

  var msgBlock = {
    from: req.session.uid,
    name: req.session.user.get("name"),
    pic: "",
    message: req.body.message
  };
  var event = sh.event("channel.message", {channel: req.body.channel, bank: [msgBlock]});

  Channel.sendInt(req.body.channel, event, function (err, uidList) {
    // SWD don't really need to wait or care about send err
    res.add(sh.event("channel.send", {status: "sent", uids: uidList}));
    req.loader.get("kMessageBank", req.body.channel, function (err, ml) {
      ml.add(msgBlock);
      return cb(0, uidList);
    });
  });
};
