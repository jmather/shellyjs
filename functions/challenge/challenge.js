var querystring = require("querystring");
var async = require("async");
var _ = require("lodash");

var shlog = require(global.gBaseDir + "/src/shlog.js");
var sh = require(global.gBaseDir + "/src/shutil.js");
var session = require(global.gBaseDir + "/src/session.js");
var dispatch = require(global.gBaseDir + "/src/dispatch.js");
var mailer = require(global.gBaseDir + "/src/shmailer.js");
var _w = require(global.gBaseDir + "/src/shcb.js")._w;

var ShSet = require(global.gBaseDir + "/src/ds/shset.js");

var Challenge = exports;

Challenge.desc = "Challenge players to the desired game and start them in it";
Challenge.functions = {
  make: {desc: "challenge a user to a game", params: {toUid: {dtype: "string"}, game: {dtype: "string"}}, security: []},
  accept: {desc: "accept a challenge from a user", params: {chId: {dtype: "string"}}, security: []},
  decline: {desc: "decline a challenge from a user", params: {chId: {dtype: "string"}}, security: []},
  withdraw: {desc: "remove a challenge made to a user", params: {chId: {dtype: "string"}}, security: []},
  list: {desc: "list all challenges recieved by the current user", params: {}, security: []},
  listSent: {desc: "list all challenges sent by the current user", params: {}, security: []},
  alist: {desc: "list all challenges for the given user", params: {uid: {dtype: "string"}}, security: ["admin"]},
  email: {desc: "email a challenge", params: {email: {dtype: "string"}, game: {dtype: "string"}}, security: []},
  emailList: {desc: "list the current email queue", params: {}, security: ["admin"]}
};

function chRemove(fromUid, toUid, gameName, cb) {
  var sendId = toUid + ":" + gameName;
  var sentSet = new ShSet("sent:" + fromUid);
  var sentData = {};
  sentSet.remove(sendId, _w(cb, function (err, data) {
    if (err) {
      return cb(err, sh.intMsg("sent-remove", {error: err, data: data}));
    }
    var recvId = fromUid + ":" + gameName;
    var recvSet = new ShSet("recv:" + toUid);
    recvSet.remove(recvId, _w(cb, function (err, data) {
      if (err) {
        return cb(err, sh.intMsg("recv-remove", {error: err, data: data}));
      }
      cb(0);
    }));
  }));
}

Challenge.make = function (req, res, cb) {
  if (_.isUndefined(global.games[req.body.game])) {
    res.add(sh.error("game-bad", "unknown game", {game: req.body.game}));
    return cb(1);
  }
  if (req.body.toUid === req.session.uid) {
    res.add(sh.error("user-bad", "you cannot challenge yourself"));
    return cb(1);
  }

  var sendId = req.body.toUid + ":" + req.body.game;
  var sendData = {toUid: req.body.toUid, game: req.body.game};
  var sentSet = new ShSet("sent:" + req.session.uid);
  sentSet.set(sendId, sendData, _w(cb, function (err, data) {
    if (err) {
      res.add(sh.error("challenges-sentset", "unable to save challenge sent", {error: err, data: data}));
      return cb(err);
    }
    var recvId = req.session.uid + ":" + req.body.game;
    var recvSet = new ShSet("recv:" + req.body.toUid);
    var recvData = {
      fromUid: req.session.uid,
      game: req.body.game,
      created: new Date().getTime(),
      name: req.session.user.get("name"),
      gender: req.session.user.get("gender"),
      age: req.session.user.get("age"),
      pict: req.session.user.get("pict")
    };
    recvSet.set(recvId, recvData, _w(cb, function (err, data) {
      if (err) {
        res.add(sh.error("challenges-recvset", "unable to save challenge recv", {error: err, data: data}));
        return cb(err);
      }
      res.chRecievedId = recvId;  // used by sendEmail - don't really need here
      dispatch.sendUser(req.body.toUid,
        sh.event("challenge.send", {chId: recvId, challenge: recvData}),
        _w(cb, function (err, data) {
          // don't care
        }));
      res.add(sh.event("challenge.make", {chId: sendId, sent: sendData}));
      return cb(0);
    }));
  }));
};

function sendEmail(emailInfo, req, res, cb) {
  if (global.C.EMAIL_QUEUE) {
    // queue the email for the consumer worker to process it
    mailer.queueEmail(emailInfo, _w(cb, function (err, data) {
      if (err) {
        res.add(sh.error("email-queue", "error queueing email", data));
        return cb(err);
      }
      res.add(sh.event(req.body.cmd, {status: "queued"}));
      return cb(0);
    }));
  } else {
    // send the email directly
    mailer.sendEmail(emailInfo, _w(cb, function (err, data) {
      if (err) {
        res.add(sh.error("email-send", "error sending challenge email", data));
        return cb(err);
      }
      res.add(sh.event(req.body.cmd, {status: "sent", info: data}));
      return cb(0);
    }));
  }
}

function sendAccept(req, res, cb) {
  req.loader.exists("kUser", req.body.toUid, _w(cb, function (err, challengeUser) {
    if (err) {
      res.add(sh.error("user-bad", "unable to load challenge user", challengeUser));
      return cb(1);
    }
    var emailInfo = {email: challengeUser.get("email"), fromProfile: req.session.user.profile(),
      toProfile: challengeUser.profile(),
      subject: req.session.user.get("name") + " accepted your challenge to play " + req.env.game.get("name"),
      gameName: req.env.game.get("name"),
      playUrl: global.C.GAMES_URL + "/lobby.html?" + querystring.stringify(
        {"s": session.create(challengeUser.get("oid")), "gn": req.env.game.get("name")}
      ),
      gameUrl: global.C.GAMES_URL + global.games[req.env.game.get("name")].url + "?" + querystring.stringify(
        {"s": session.create(challengeUser.get("oid")), "gameId": req.env.game.get("oid")}
      ),
      template: "accepted"};
    shlog.info("dfltgrp", emailInfo);

    sendEmail(emailInfo, req, res, cb);
  }));
}

Challenge.accept = function (req, res, cb) {
  var chParts = req.body.chId.split(":");
  var fromUid = chParts[0];
  var gameName = chParts[1];
  chRemove(fromUid, req.session.uid, gameName, _w(cb, function (err, data) {
    if (err) {
      res.add(sh.error("challenge-remove", "unable to remove challenge"), data);
      return cb(err);
    }
    req.body.cmd = "game.create";     // change the command so we can forward
    req.body.name = gameName;
    req.body.players = [req.session.uid, fromUid];
    sh.call(req, res, _w(cb, function (error) {
      if (error) {
        return cb(error);
      }
      res.msgs = []; // clear the game create msgs - SWD - should add res.clear();
      res.add(sh.event("challenge.accept", {chId: req.body.chId}));

      // wait for game to save to avoid race condition
      req.loader.dump(_w(cb, function (err) {
        var startInfo = {};
        startInfo.gameName = req.env.game.get("name");
        startInfo.gameId = req.env.game.get("oid");
        var event = sh.event("challenge.start", startInfo);
        res.add(event);
        dispatch.sendUsers(req.body.players, event, req.session.uid);

        req.body.toUid = fromUid;  // send the notif back to creating user
        sendAccept(req, res, cb);
      }));
    }));
  }));
};

Challenge.decline = function (req, res, cb) {
  var chParts = req.body.chId.split(":");
  var fromUid = chParts[0];
  var gameName = chParts[1];
  chRemove(fromUid, req.session.uid, gameName, _w(cb, function (err, data) {
    if (err) {
      res.add(sh.error("challenge-remove", "unable to remove challenge"), data);
      return cb(err);
    }
    res.add(sh.event("challenge.decline", {chId: req.body.chId}));
    return cb(0);
  }));
};

Challenge.withdraw = function (req, res, cb) {
  var chParts = req.body.chId.split(":");
  var toUid = chParts[0];
  var gameName = chParts[1];
  chRemove(req.session.uid, toUid, gameName, _w(cb, function (err, data) {
    if (err) {
      res.add(sh.error("challenge-remove", "unable to remove challenge"), data);
      return cb(err);
    }
    res.add(sh.event("challenge.withdraw", {chId: req.body.chId}));
    return cb(0);
  }));
};

Challenge.list = function (req, res, cb) {
  var test = new ShSet("recv:" + req.session.uid);
  test.getAll(_w(cb, function (err, data) {
    if (err) {
      res.add(sh.error("challenges-getall", "unable to load challenge list", {error: err, data: data}));
      return cb(err);
    }
    res.add(sh.event("challenge.list", data));
    return cb(0);
  }));
};

Challenge.listSent = function (req, res, cb) {
  var test = new ShSet("sent:" + req.session.uid);
  test.getAll(_w(cb, function (err, data) {
    if (err) {
      res.add(sh.error("challenges-getall", "unable to load challenge list", {error: err, data: data}));
      return cb(err);
    }
    res.add(sh.event("challenge.listSent", data));
    return cb(0);
  }));
};

Challenge.alist = function (req, res, cb) {
  var test = new ShSet("recv:" + req.body.uid);
  test.getAll(_w(cb, function (err, data) {
    if (err) {
      res.add(sh.error("challenges-getall", "unable to load challenge list", {error: err, data: data}));
      return cb(err);
    }
    res.add(sh.event("challenge.alist", data));
    return cb(0);
  }));
};

function sendChallenge(req, res, cb) {
  req.loader.exists("kUser", req.body.toUid, _w(cb, function (err, challengeUser) {
    if (err) {
      res.add(sh.error("user-bad", "unable to load challenge user", challengeUser));
      return cb(1);
    }
    var emailInfo = {email: req.body.email, fromProfile: req.session.user.profile(),
      toProfile: challengeUser.profile(),
      subject: req.session.user.get("name") + " has challenged you to " + req.body.game,
      gameName: req.body.game,
      playUrl: global.C.GAMES_URL + "/lobby.html?" + querystring.stringify(
        {"s": session.create(challengeUser.get("oid")), "gn": req.body.game}
      ),
      challengeUrl: global.C.GAMES_URL + "/challenges.html?" + querystring.stringify(
        {"s": session.create(challengeUser.get("oid")), "chId": res.chRecievedId}
      ),
      template: "challenge"};
    shlog.info("dfltgrp", emailInfo);

    sendEmail(emailInfo, req, res, cb);
  }));
}

Challenge.email = function (req, res, cb) {
  // get uid from email name - creates one if not there
  req.body.cmd = "reg.create";
  req.body.password = "XXXXXX";
  req.body.toUid = null;
  sh.call(req, res, _w(cb, function (error, data) {
    res.msgs = []; // SWD clear the reg.create event - dont' want it  - should also switch this to res.clear
    if (error && error !== 2) {
      return cb(error);
    }
    if (error === 2) {
      shlog.info("dfltgrp", "user already created", data.get("uid"));
      // existing email map object
      req.body.toUid = data.get("uid");
      res.clear();
    } else {
      // user object
      req.body.toUid = data.get("oid");
    }
    req.body.cmd = "challenge.make";
    sh.call(req, res, _w(cb, function (error, data) {
      if (error) {
        return cb(error);
      }
      req.body.cmd = "challenge.email";  // flip back for sendEmail response
      sendChallenge(req, res, cb);
    }));
  }));
};

// SWD this should probably be moved to the system or a new email module
Challenge.emailList = function (req, res, cb) {
  mailer.queueList(_w(cb, function (err, data) {
    if (err) {
      res.add(sh.error("emaillist-get", "error getting job queue", data));
      return cb(err);
    }
    res.add(sh.event("challenge.emailList", data));
    return cb(0);
  }));
};