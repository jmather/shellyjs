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

Channel.sendOnline = function (ws, channel) {
  _.each(global.channels[channel], function (uws) {
    var event = sh.event("live.user", {uid: uws.uid, name: uws.name, pic: "",  status: "on"});
    sh.sendWs(ws, 0, event);
  });
};

Channel.list = function (req, res, cb) {
  var users = {};
  _.forOwn(global.gUsers, function (prop, key, obj) {
    users[key] = _.omit(obj[key], "ws");
  });
  res.add(sh.event("Channel.list", users));
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
  global.channels[req.body.channel].push(res.ws);
  res.ws.channels[req.body.channel] = "on";  // cross ref so we can call remove on socket close
  shlog.info("add", req.body.channel, global.channels[req.body.channel].length);

  // notify channel of user add
  var event = sh.event("live.user", {uid: res.ws.uid, name: req.session.user.get("name"), pic: "",  status: "on"});
  Channel.sendInt(req.body.channel, event);

  // notify me of online users
  Channel.sendOnline(res.ws, req.body.channel);

  req.loader.get("kMessageBank", req.body.channel, function (err, ml) {
    if (!err) {
      res.add(sh.event("live.message", ml.get("bank")));
    }
    cb(0);
  });
};

Channel.removeInt = function (ws, channel) {
  var idx = global.channels[channel].indexOf(ws);
  global.channels[channel].splice(idx, 1);
  delete ws.channels[channel];  // remove cross ref as the user removed it
  shlog.info("remove", channel, global.channels[channel].length);

  var event = sh.event("live.user", {uid: ws.uid, name: ws.name, pic: "",  status: "off"});
  Channel.sendInt(channel, event);
};

Channel.remove = function (req, res, cb) {
  if (_.isUndefined(res.ws)) {
    res.add(sh.error("socket_only_call", "this call can only be made from the socket interafce"));
    return cb(1);
  }

  Channel.removeInt(res.ws, req.body.channel, req.session.user);

  cb(0);
};

Channel.send = function (req, res, cb) {
  shlog.info("Channel.message: ", req.body.channel, req.body.message);

  var msgBlock = {channel: req.body.channel,
    from: req.session.uid,
    name: req.session.user.get("name"),
    pic: "",
    message: req.body.message};
  var event = sh.event("live.message", [msgBlock]);

  Channel.sendInt(req.body.channel, event);

  req.loader.get("kMessageBank", req.body.channel, function (err, ml) {
    ml.add(msgBlock);
    return cb(0);
  });
};
