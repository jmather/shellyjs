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

// send directly to user using socket id in global map
// might this go in socket module?
Channel.sendDirect = function (wsId, data) {
  if (_.isUndefined(data)) {
    shlog.info("bad send data:", data);
    return false;
  }
  var ws = global.sockets[wsId];
  if (_.isUndefined(ws)) {
    shlog.info("global socket not found:", wsId);
    return false;
  }
  try {
    sh.sendWs(ws, 0, data);
  } catch (e) {
    shlog.info("global socket dead:", wsId, e);
    return false;
  }
  return true;
};

Channel.list = function (req, res, cb) {
  global.db.smembers(req.body.channel, function (err, data) {
    if (err) {
      res.add(sh.error("error_getting_channel", err, data));
      return cb(1);
    }
    res.add(sh.event("channel.list", data));
    return cb(0);
  });
};

Channel.add = function (req, res, cb) {
  shlog.info("channel.add: ", req.body.channel, req.session.uid);

  if (_.isUndefined(res.ws)) {
    res.add(sh.error("socket_only_call", "this call can only be made from the socket interafce"));
    return cb(1);
  }

  global.db.sadd(req.body.channel, req.session.uid, function (err, data) {
    if (err) {
      res.add(sh.error("error_adding_channel", data));
      return cb(1);
    }
    res.add(sh.event("channel.add", data));
    res.ws.channels[req.body.channel] = "on";  // cross ref so we can call remove on socket close

    // notify the list of users I'm on
    var event = sh.event("channel.user", {channel: req.body.channel, uid: res.ws.uid, name: res.ws.name, status: "on"});
    Channel.sendInt(req.body.channel, event, function (err, uidList) {

      // send me a list of current users
      _.each(uidList, function (uid) {
        var event = sh.event("channel.user", {channel: req.body.channel, uid: uid, name: uid, status: "on"});
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

/*
  // notify existing channel of user add
 var event = sh.event("channel.user", {channel: req.body.channel,
 uid: res.ws.uid, name: res.ws.name, pic: "",  status: "on"});
  Channel.sendInt(req.body.channel, event);

  // add me to the channel
  global.channels[req.body.channel].push(res.ws);
  res.ws.channels[req.body.channel] = "on";  // cross ref so we can call remove on socket close
  shlog.info("add", req.body.channel, global.channels[req.body.channel].length);

  // update master stats for channel
  if (req.body.channel.substr(0, 6) === "lobby:") {
    process.send({cmd: "stat", wid: cluster.worker.id,
      key: req.body.channel, count: global.channels[req.body.channel].length});
  }

  // notify me of online channel users
  // SWD might want to put flag on channels that really need this
  // as it generates a lot of presence traffic
  Channel.sendOnline(res.ws, req.body.channel);
*/
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
    res.add(sh.error("socket_only_call", "this call can only be made from the socket interafce"));
    return cb(1);
  }

  Channel.removeInt(req.body.channel, req.session.uid, function (err, event) {
    if (err) {
      res.add(sh.error("bad_remove", "unable to remove user from channel"));
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
    dispatch.sendUsers(uidList, event);
    if (_.isFunction(cb)) {
      return cb(0, uidList);
    }
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
