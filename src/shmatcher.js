var _ = require("lodash");

var shlog = require(global.gBaseDir + "/src/shlog.js");
var sh = require(global.gBaseDir + "/src/shutil.js");
var ShLoader = require(global.gBaseDir + "/src/shloader.js");
var mailer = require(global.gBaseDir + "/src/shmail.js");
var shcluster = require(global.gBaseDir + "/src/shcluster.js");
var dispatch = require(global.gBaseDir + "/src/dispatch.js");

var shmatcher = exports;

var gMatchSet = "match:any:";
var gLoader = null;

function matchKey(gameName) {
  return gMatchSet + gameName;
}

shmatcher.match = function (uidList, cb) {
//  return cb(0, {error: err, status: responseStatus});
  return cb(0);
};

// res.add for game.create call
function add(data) {
  if (_.isUndefined(this.msgs)) {
    this.msgs = [];
  }
  this.msgs.push(data);
}

function matchLoop(gameName) {
  global.db.scard(matchKey(gameName), function (err, data) {
    shlog.debug(matchKey(gameName), data);
    if (err || data < 2) {
      // empty set, wait and loop
      shlog.debug("not enough users", matchKey(gameName), data);
      setTimeout(function () {matchLoop(gameName); }, 5000);
      return;
    }
    // try match - spop 2
    global.db.spop(matchKey(gameName), function (err, uid1) {
      shlog.info("pop user", matchKey(gameName), data);
      if (err || uid1 === null) {
        setTimeout(function () {matchLoop(gameName); }, 5000);
        return;
      }
      var uidList = [];
      global.db.spop(matchKey(gameName), function (err, uid2) {
        if (err || uid2 === null) {
          // add first user popped back in
          shlog.info("error getting second user", err, uid2);
          global.db.sadd(matchKey(gameName), uid1, function (err, data) {
            shlog.info("add first user back to set", uid1);
            // ignore for now
          });
          setTimeout(function () {matchLoop(gameName); }, 5000);
          return;
        }
        var req = {};
        req.loader = gLoader;
        req.session = {};
        req.session.valid = true;
        req.session.uid = uid1;
        req.body = {};
        req.body.cmd = "game.create";     // change the command so we can forward
        req.body.name = gameName;
        req.body.players = [uid1, uid2];
        var res = {};
        res.add = add;
        shlog.info("match made, create game", req.body.players);
        sh.call(req, res, function (error) {
          if (error) {
            // problem - push the uids back
            shlog.error(error, res.msgs);
            return;
          }
          gLoader.dump(function (err) {
            var startInfo = {};
            startInfo.gameName = gameName;
            startInfo.gameId = req.env.game.get("oid");
            dispatch.sendUsers(req.body.players, sh.event("challenge.start", startInfo));
          });
        });

        dispatch.sendUsers(uidList, sh.event("game.matcher", "gameId and info here"));
        matchLoop(gameName);
      });
    });
  });
}

shmatcher.add = function (gameName, uid, cb) {
//  emailInfo.timeQueued = new Date().getTime();
  global.db.sadd(matchKey(gameName), uid, cb);
};

shmatcher.queueList = function (gameName, cb) {
  global.db.smembers(matchKey(gameName), cb);
};

shmatcher.start = function () {
  process.on("uncaughtException", function (error) {
    shlog.error("uncaughtException", error.stack);
    // restart the loop
    matchLoop("connect4");
  });

  gLoader = new ShLoader();
  shcluster.init(function (err, data) {
    if (err) {
      shlog.error("unable to start shcluster module");
      return;
    }
    shlog.info("starting macher");
    matchLoop("connect4");
  });
};