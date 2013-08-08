var _ = require("lodash");

var shlog = require(global.gBaseDir + "/src/shlog.js");
var sh = require(global.gBaseDir + "/src/shutil.js");
var ShLoader = require(global.gBaseDir + "/src/shloader.js");
var mailer = require(global.gBaseDir + "/src/shmail.js");
var dispatch = require(global.gBaseDir + "/src/dispatch.js");
var _w = require(global.gBaseDir + "/src/shcb.js")._w;

var shmatcher = exports;

var gMatchSet = "match:any:";
var gGameName = "";
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

/*global matchLoop */
function matchError(err, data) {
  // wait and try again
  setTimeout(matchLoop, 5000);
}

function matchLoop() {
  global.db.scard(matchKey(gGameName), _w(matchError, function (err, data) {
    shlog.debug(matchKey(gGameName), data);
    if (err || data < 2) {
      // empty set, wait and loop
      shlog.debug("not enough users", matchKey(gGameName), data);
      setTimeout(function () {matchLoop(); }, 5000);
      return;
    }
    // try match - spop 2
    global.db.spop(matchKey(gGameName), _w(matchError, function (err, uid1) {
      shlog.info("pop user", matchKey(gGameName), data);
      if (err || uid1 === null) {
        setTimeout(function () {matchLoop(); }, 5000);
        return;
      }
      var uidList = [];
      global.db.spop(matchKey(gGameName), _w(matchError, function (err, uid2) {
        if (err || uid2 === null) {
          // add first user popped back in
          shlog.info("error getting second user", err, uid2);
          global.db.sadd(matchKey(gGameName), uid1, function (err, data) {
            shlog.info("add first user back to set", uid1);
            // ignore for now
          });
          setTimeout(function () {matchLoop(); }, 5000);
          return;
        }
        var req = {};
        req.loader = gLoader;
        req.session = {};
        req.session.valid = true;
        req.session.uid = uid1;
        req.body = {};
        req.body.cmd = "game.create";     // change the command so we can forward
        req.body.name = gGameName;
        req.body.players = [uid1, uid2];
        var res = {};
        res.add = add;
        shlog.info("match made, create game", req.body.players);
        sh.call(req, res, _w(matchError, function (error) {
          if (error) {
            // problem - push the uids back
            shlog.error(error, res.msgs);
            return;
          }
          gLoader.dump(function (err) {
            var startInfo = {};
            startInfo.gameName = gGameName;
            startInfo.gameId = req.env.game.get("oid");
            dispatch.sendUsers(req.body.players, sh.event("challenge.start", startInfo));
          });
        }));

        dispatch.sendUsers(uidList, sh.event("game.matcher", "gameId and info here"));
        matchLoop();
      }));
    }));
  }));
}

shmatcher.add = function (gameName, uid, cb) {
//  emailInfo.timeQueued = new Date().getTime();
  global.db.sadd(matchKey(gameName), uid, cb);
};

shmatcher.queueList = function (gameName, cb) {
  global.db.smembers(matchKey(gameName), cb);
};

shmatcher.start = function (gameName) {
  // can do this as matcher is per process
  gGameName = gameName;
  process.on("uncaughtException", function (error) {
    shlog.error("uncaughtException", error.stack);
    // restart the loop
    matchLoop();
  });

  gLoader = new ShLoader();
  shlog.info("starting matcher");
  matchLoop();
};

shmatcher.shutdown = function (cb) {
  shlog.info("shutdown matcher");
  cb(0);
};