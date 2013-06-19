var cluster = require("cluster");
var _ = require("lodash");

var shlog = require(global.gBaseDir + "/src/shlog.js");
var sh = require(global.gBaseDir + "/src/shutil.js");
var shcluster = require(global.gBaseDir + "/src/shcluster");

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

// send directly to user using socket id in global map
// might this go in socket module
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

Channel.sendInt = function (channel, data, forward) {
  // default forward on to cluster
  if (cluster.isWorker && (_.isUndefined(forward) || forward === true)) {
    process.send({cmd: "forward", wid: cluster.worker.id, toWid: "all", channel: channel, data: data});
  }

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

// send to all in "ids" list by prepending the "prefix"
Channel.sendAll = function (prefix, ids, data) {
  shlog.info("sendAll", prefix, ids);

  _.each(ids, function (id) {
    //SWD: this will get fixed with move to dispatch
    Channel.sendInt(prefix + id, data);
    shcluster.sendUser(id, data, function (err, data) {
      // ignore the returns for now
    });
  });
};

// notify the current socket of users on this channel
Channel.sendOnline = function (ws, channel) {
  if (cluster.isWorker) {
    process.send({cmd: "who.query", wid: cluster.worker.id, toWid: "all", channel: channel, fromUid: ws.uid,
      fromWsid: ws.id});
  }

  _.each(global.channels[channel], function (uws) {
    var event = sh.event("channel.user", {channel: channel, uid: uws.uid, name: uws.name, pic: "",  status: "on"});
    sh.sendWs(ws, 0, event);
  });
};

// notify the calling worker of any users on this channel
// only called in cluster mode
Channel.returnOnline = function (channel, fromWid, toWsid) {
  if (!cluster.isWorker) {
    shlog.error("function can only be called in cluster mode");
    return;
  }
  _.each(global.channels[channel], function (uws) {
    var event = sh.event("channel.user", {channel: channel, uid: uws.uid, name: uws.name, pic: "",  status: "on"});
    process.send({cmd: "who.return", wid: cluster.worker.id, toWid: fromWid, toWsid: toWsid, data: event});
  });
};

// SWD must fix this to also send cluster command
// this will be more like an add that fires a bunch of channel.list messages to caller
Channel.list = function (req, res, cb) {
  var channels = {};

  _.each(global.channels, function (wsList, name) {
    channels[name] = wsList.length;
  });

  res.add(sh.event("channel.list", channels));
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
    uid: res.ws.uid, name: res.ws.name, pic: "",  status: "on"});
  Channel.sendInt(req.body.channel, event);

  // add me to the channel
  global.channels[req.body.channel].push(res.ws);
  res.ws.channels[req.body.channel] = "on";  // cross ref so we can call remove on socket close
  shlog.info("add", req.body.channel, global.channels[req.body.channel].length);

  // update master stats for channel
  if (cluster.isWorker) {
    process.send({cmd: "stat", wid: cluster.worker.id,
      key: req.body.channel, count: global.channels[req.body.channel].length});
  }

  // notify me of online channel users
  // SWD might want to put flag on channels that realy need this
  // as it generates a lot of presence traffic
  Channel.sendOnline(res.ws, req.body.channel);

  req.loader.get("kMessageBank", req.body.channel, function (err, ml) {
    if (!err) {
      res.add(sh.event("channel.message", {channel: req.body.channel, bank: ml.get("bank")}));
    }
    return cb(0);
  });
};

Channel.removeInt = function (ws, channel) {
  var idx = global.channels[channel].indexOf(ws);
  global.channels[channel].splice(idx, 1);
  shlog.info("remove", channel, global.channels[channel].length);
  delete ws.channels[channel];  // remove cross ref as the user removed it

  var event = sh.event("channel.user", {channel: channel, uid: ws.uid, name: ws.name, pic: "",  status: "off"});
  Channel.sendInt(channel, event);

  // update master stats for channel
  if (cluster.isWorker) {
    process.send({cmd: "stat", wid: cluster.worker.id, key: channel, count: global.channels[channel].length});
  }

  return event;
};

Channel.remove = function (req, res, cb) {
  if (_.isUndefined(res.ws)) {
    res.add(sh.error("socket_only_call", "this call can only be made from the socket interafce"));
    return cb(1);
  }

  // send to myself for house keeping, removeInt does the channel send
  var event = Channel.removeInt(res.ws, req.body.channel, req.session.user);
  res.add(event);

  return cb(0);
};

Channel.send = function (req, res, cb) {
  shlog.info("Channel.message: ", req.body.channel, req.body.message);

  var msgBlock = {
    from: req.session.uid,
    name: req.session.user.get("name"),
    pic: "",
    message: req.body.message
  };
  var event = sh.event("channel.message", {channel: req.body.channel, bank: [msgBlock]});

  Channel.sendInt(req.body.channel, event);
  res.add(sh.event("channel.send", {status: "sent"}));

  req.loader.get("kMessageBank", req.body.channel, function (err, ml) {
    ml.add(msgBlock);
    return cb(0);
  });
};
