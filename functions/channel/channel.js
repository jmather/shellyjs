var _ = require("lodash");

var shlog = require(global.gBaseDir + "/src/shlog.js");
var sh = require(global.gBaseDir + "/src/shutil.js");

var Channel = exports;

Channel.desc = "game state and control module";
Channel.functions = {
  list: {desc: "list online users", params: {channel: {dtype: "string"}}, security: []},
  add: {desc: "add this socket to the channel", params: {channel: {dtype: "string"}}, security: []},
  remove: {desc: "remove this socket from the channel", params: {channel: {dtype: "string"}}, security: []},
  send: {desc: "send a message to all users on channel", params: {channel: {dtype: "string"}, message: {dtype: "string"}}, security: []}
};

var channelDef = {
  user: {persist: true, maxEvents: 50},
  lobby: {persist: true, maxEvents: 50},
  games: {persist: true, maxEvents: 50},
  turns: {persist: false, maxEvents: 0},
  matches: {persist: false, maxEvents: 0}
};

if (_.isUndefined(global.channels)) {
  global.channels = {};
}

Channel.sendInt = function (channel, data) {
  global.channels[channel] = _.filter(global.channels[channel], function (ws) {
    try {
      sh.sendWs(ws, 0, data);
    } catch (e) {
      shlog.info(channel, "dead socket");
      return false;
    }
    return true;
  });
};

Channel.sendAll = function (prefix, ids, data) {
  shlog.info("sendAll", prefix, ids);

  _.each(ids, function (id) {
    Channel.sendInt(prefix + id, data);
  });
};

Channel.sendOnline = function (ws, channel) {
  _.each(global.channels[channel], function (uws) {
    var event = sh.event("channel.user", {channel: channel, uid: uws.uid, name: uws.name, pic: "",  status: "on"});
    sh.sendWs(ws, 0, event);
  });
};

Channel.list = function (req, res, cb) {
  var users = {};

  _.each(global.channels[req.body.channel], function (ws) {
    users[ws.uid] = {uid: ws.uid, name: ws.name, pic: ""};
  });

  res.add(sh.event("channel.list", users));
  return cb(0);
};

Channel.add = function (req, res, cb) {
  if (_.isUndefined(res.ws)) {
    res.add(sh.error("socket_only_call", "this call can only be made from the socket interafce"));
    return cb(1);
  }

  if (_.isUndefined(global.channels[req.body.channel])) {
    global.channels[req.body.channel] = [];
  }

  // notify existing channel of user add
  var event = sh.event("channel.user", {channel: req.body.channel,
    uid: res.ws.uid, name: req.session.user.get("name"), pic: "",  status: "on"});
  Channel.sendInt(req.body.channel, event);

  // add me to the channel
  global.channels[req.body.channel].push(res.ws);
  res.ws.channels[req.body.channel] = "on";  // cross ref so we can call remove on socket close
  shlog.info("add", req.body.channel, global.channels[req.body.channel].length);

  // notify me of online channel users
  Channel.sendOnline(res.ws, req.body.channel);

  req.loader.get("kMessageBank", req.body.channel, function (err, ml) {
    if (!err) {
      res.add(sh.event("channel.message", ml.get("bank")));
    }
    return cb(0);
  });
};

Channel.removeInt = function (ws, channel) {
  var idx = global.channels[channel].indexOf(ws);
  global.channels[channel].splice(idx, 1);
  delete ws.channels[channel];  // remove cross ref as the user removed it
  shlog.info("remove", channel, global.channels[channel].length);

  var event = sh.event("channel.user", {channel: channel, uid: ws.uid, name: ws.name, pic: "",  status: "off"});
  Channel.sendInt(channel, event);
};

Channel.remove = function (req, res, cb) {
  if (_.isUndefined(res.ws)) {
    res.add(sh.error("socket_only_call", "this call can only be made from the socket interafce"));
    return cb(1);
  }

  Channel.removeInt(res.ws, req.body.channel, req.session.user);

  return cb(0);
};

Channel.send = function (req, res, cb) {
  shlog.info("Channel.message: ", req.body.channel, req.body.message);

  var msgBlock = {channel: req.body.channel,
    from: req.session.uid,
    name: req.session.user.get("name"),
    pic: "",
    message: req.body.message};
  var event = sh.event("channel.message", [msgBlock]);

  Channel.sendInt(req.body.channel, event);
  res.add(sh.event("channel.send", {status: "sent"}));

  req.loader.get("kMessageBank", req.body.channel, function (err, ml) {
    ml.add(msgBlock);
    return cb(0);
  });
};
