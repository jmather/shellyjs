var events = require("events");
var async = require("async");
var _ = require("lodash");

var shlog = require(global.gBaseDir + "/src/shlog.js");
var sh = require(global.gBaseDir + "/src/shutil.js");
var dispatch = require(global.gBaseDir + "/src/dispatch.js");

var Challenge = exports;

Challenge.desc = "Challenge players to the desired game and start them in it";
Challenge.functions = {
  make: {desc: "challenge a user to a game", params: {toUid: {dtype: "string"}, game: {dtype: "string"}}, security: []},
  accept: {desc: "accept a challenge from a user", params: {chId: {dtype: "string"}}, security: []},
  decline: {desc: "decline a challenge from a user", params: {chId: {dtype: "string"}}, security: []},
  withdraw: {desc: "remove a challenge made to a user", params: {chId: {dtype: "string"}}, security: []},
  list: {desc: "list all challenges for the current user", params: {}, security: []},
  alist: {desc: "list all challenges for the given user", params: {uid: {dtype: "string"}}, security: ["admin"]}
};

Challenge.make = function (req, res, cb) {
  if (_.isUndefined(global.matchInfo[req.body.game])) {
    res.add(sh.error("bad_game", "unknown game", {game: req.body.game}));
    return cb(1);
  }
  if (req.body.toUid === req.session.uid) {
    res.add(sh.error("bad_user", "you cannot challenge yourself"));
    return cb(1);
  }

  req.loader.get("kChallenges", req.session.uid, function (err, challenges) {
    if (err) {
      res.add(sh.error("challenge_get", "unable to load challenge list"), {uid: req.session.uid});
      return cb(err);
    }
    var chId = challenges.addSend(req.body.toUid, req.body.game);
    res.add(sh.event("challenge.make", {chId: chId, sent: challenges.get("sent")[chId]}));
    req.loader.get("kChallenges", req.body.toUid, function (err, challenges) {
      if (err) {
        res.add(sh.error("challenge_get", "unable to load challenge list"), {uid: req.session.uid});
        return cb(err);
      }
      var chId = challenges.addRecieved(req.session.uid, req.body.game, {
        name: req.session.user.get("name"),
        gender: req.session.user.get("gender"),
        age: req.session.user.get("age"),
        pict: req.session.user.get("pict")
      });
      dispatch.sendUser(req.body.toUid,
        sh.event("challenge.send", {chId: chId, challenge: challenges.get("recieved")[chId]}),
        function (err, data) {
          // don't care
        });
      return cb(0);
    });
  });
};

Challenge.accept = function (req, res, cb) {
  req.loader.get("kChallenges", req.session.uid, function (err, challenges) {
    if (err) {
      res.add(sh.error("challenge_get", "unable to load challenge list"), {uid: req.session.uid});
      return cb(err);
    }
    challenges.removeRecieved(req.body.chId);
    // create a game and forward the user to the game url;
    res.add(sh.event("challenge.accept", {chId: req.body.chId}));
    return cb(0);
  });
};

Challenge.decline = function (req, res, cb) {
  req.loader.get("kChallenges", req.session.uid, function (err, challenges) {
    if (err) {
      res.add(sh.error("challenge_get", "unable to load challenge list"), {uid: req.session.uid});
      return cb(err);
    }
    challenges.removeRecieved(req.body.chId);
    res.add(sh.event("challenge.decline", {chId: req.body.chId}));
    return cb(0);
  });
};

Challenge.withdraw = function (req, res, cb) {
  res.add(sh.event("challenge.withdraw"));
  return cb(0);
};

Challenge.list = function (req, res, cb) {
  req.loader.get("kChallenges", req.session.uid, function (err, challenges) {
    if (err) {
      res.add(sh.error("challenge_get", "unable to load challenge list"), {uid: req.session.uid});
      return cb(err);
    }
    res.add(sh.event("challenge.list", challenges.getData()));
    return cb(0);
  });
};

Challenge.alist = function (req, res, cb) {
  req.loader.get("kChallenges", req.body.uid, function (err, challenges) {
    if (err) {
      res.add(sh.error("challenge_get", "unable to load challenge list"), {uid: req.session.uid});
      return cb(err);
    }
    res.add(sh.event("challenge.list", challenges.getData()));
    return cb(0);
  });
};