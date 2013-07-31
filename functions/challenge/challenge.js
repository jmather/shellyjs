var querystring = require("querystring");
var async = require("async");
var _ = require("lodash");

var shlog = require(global.gBaseDir + "/src/shlog.js");
var sh = require(global.gBaseDir + "/src/shutil.js");
var session = require(global.gBaseDir + "/src/session.js");
var dispatch = require(global.gBaseDir + "/src/dispatch.js");
var mailer = require(global.gBaseDir + "/src/shmailer.js");

var Challenge = exports;

Challenge.desc = "Challenge players to the desired game and start them in it";
Challenge.functions = {
  make: {desc: "challenge a user to a game", params: {toUid: {dtype: "string"}, game: {dtype: "string"}}, security: []},
  accept: {desc: "accept a challenge from a user", params: {chId: {dtype: "string"}}, security: []},
  decline: {desc: "decline a challenge from a user", params: {chId: {dtype: "string"}}, security: []},
  withdraw: {desc: "remove a challenge made to a user", params: {chId: {dtype: "string"}}, security: []},
  list: {desc: "list all challenges for the current user", params: {}, security: []},
  alist: {desc: "list all challenges for the given user", params: {uid: {dtype: "string"}}, security: ["admin"]},
  email: {desc: "email a challenge", params: {email: {dtype: "string"}, game: {dtype: "string"}}, security: []},
  jobs: {desc: "list the current job queue", params: {}, security: ["admin"]}
};

Challenge.make = function (req, res, cb) {
  if (_.isUndefined(global.games[req.body.game])) {
    res.add(sh.error("bad_game", "unknown game", {game: req.body.game}));
    return cb(1);
  }
  if (req.body.toUid === req.session.uid) {
    res.add(sh.error("bad_user", "you cannot challenge yourself"));
    return cb(1);
  }

  req.loader.get("kChallenges", req.session.uid, function (err, challenges) {
    if (err) {
      res.add(sh.error("challenge_get", "unable to load challenge list", {uid: req.session.uid}));
      return cb(err);
    }
    var chId = challenges.addSend(req.body.toUid, req.body.game);
    res.add(sh.event("challenge.make", {chId: chId, sent: challenges.get("sent")[chId]}));
    req.loader.get("kChallenges", req.body.toUid, function (err, challenges) {
      if (err) {
        res.add(sh.error("challenge_get", "unable to load challenge list", {uid: req.session.uid}));
        return cb(err);
      }
      var chId = challenges.addRecieved(req.session.uid, req.body.game, {
        name: req.session.user.get("name"),
        gender: req.session.user.get("gender"),
        age: req.session.user.get("age"),
        pict: req.session.user.get("pict")
      });
      res.chRecievedId = chId;
      dispatch.sendUser(req.body.toUid,
        sh.event("challenge.send", {chId: chId, challenge: challenges.get("recieved")[chId]}),
        function (err, data) {
          // don't care
        });
      return cb(0);
    });
  });
};

function sendEmail(emailInfo, req, res, cb) {
  if (global.C.EMAIL_QUEUE) {
    // queue the email for the consumer worker to process it
    mailer.queueEmail(emailInfo, function (err, data) {
      if (err) {
        res.add(sh.error(req.body.cmd, "error queueing email", data));
        return cb(err);
      }
      res.add(sh.event(req.body.cmd, {status: "queued"}));
      return cb(0);
    });
  } else {
    // send the email directly
    mailer.sendEmail(emailInfo, function (err, data) {
      if (err) {
        res.add(sh.error(req.body.cmd, "error sending challenge email", data));
        return cb(err);
      }
      res.add(sh.event(req.body.cmd, {status: "sent", info: data}));
      return cb(0);
    });
  }
}

function sendAccept(req, res, cb) {
  req.loader.exists("kUser", req.body.toUid, function (err, challengeUser) {
    if (err) {
      res.add(sh.error("challenge.accept", "unable to load challenge user", challengeUser));
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
    shlog.info(emailInfo);

    sendEmail(emailInfo, req, res, cb);
  });
}

Challenge.accept = function (req, res, cb) {
  req.loader.get("kChallenges", req.session.uid, function (err, challenges) {
    if (err) {
      res.add(sh.error("challenge_get", "unable to load challenge list"), {uid: req.session.uid});
      return cb(err);
    }

    var challenge = challenges.get("recieved")[req.body.chId];

    req.body.cmd = "game.create";     // change the command so we can forward
    req.body.name = challenge.game;
    req.body.players = [req.session.uid, challenge.fromUid];
    sh.call(req, res, function (error) {
      if (error) {
        return cb(error);
      }
      challenges.removeRecieved(req.body.chId);
      // wait for game to save to avoid race condition
      req.loader.dump(function (err) {
        var startInfo = {};
        startInfo.gameName = req.env.game.get("name");
        startInfo.gameId = req.env.game.get("oid");
        var event = sh.event("challenge.start", startInfo);
        res.add(event);
        dispatch.sendUsers(req.body.players, event, req.session.uid);

        res.add(sh.event("challenge.accept", {chId: req.body.chId}));
        req.body.toUid = challenge.fromUid;  // send the notif back to creating user
        sendAccept(req, res, cb);
      });
    });
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

function sendChallenge(req, res, cb) {
  req.loader.exists("kUser", req.body.toUid, function (err, challengeUser) {
    if (err) {
      res.add(sh.error("challenge.email", "unable to load challenge user", challengeUser));
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
    shlog.info(emailInfo);

    sendEmail(emailInfo, req, res, cb);
  });
}

Challenge.email = function (req, res, cb) {
  // get uid from email name - creates one if not there
  req.body.cmd = "reg.create";
  req.body.password = "XXXXXX";
  req.body.toUid = null;
  sh.call(req, res, function (error, data) {
    if (error && error !== 2) {
      return cb(error);
    }
    if (error === 2) {
      shlog.info("user already created", data.get("uid"));
      // existing email map object
      req.body.toUid = data.get("uid");
      res.clear();
    } else {
      // user object
      req.body.toUid = data.get("oid");
    }
    req.body.cmd = "challenge.make";
    sh.call(req, res, function (error, data) {
      if (error) {
        return cb(error);
      }
      req.body.cmd = "challenge.email";  // flip back for sendEmail response
      sendChallenge(req, res, cb);
    });
  });
};

Challenge.jobs = function (req, res, cb) {
  mailer.queueList(function (err, data) {
    if (err) {
      res.add(sh.error("challenge.jobs", "error getting job queue", data));
      return cb(err);
    }
    res.add(sh.event("challenge.jobs", data));
    return cb(0);
  });
};