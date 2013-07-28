var os = require("os");
var fs = require("fs");
var path = require("path");
var cluster = require("cluster");
var _ = require("lodash");

global.gBaseDir = path.dirname(__dirname);

global.configBase = global.gBaseDir + "/config";
// first param alters config dir
if (_.isString(process.argv[2])) {
  global.configBase = process.argv[2];
}

global.C = {};
global.CDEF = function (name, value) {
  if (_.isUndefined(global.C[name])) {
    global.C[name] = value;
  }
};
// load configs with private key and per machine overrides
/*jslint stupid: true */
var keyConfigFn = global.configBase + "/keys.js";
if (fs.existsSync(keyConfigFn)) {
  require(keyConfigFn);
}
// load configs with per machine overrides
var machineConfigFn = global.configBase + "/" + os.hostname() + ".js";
/*jslint stupid: true */
if (fs.existsSync(machineConfigFn)) {
  require(machineConfigFn);
}
require(global.configBase + "/main.js");
global.PACKAGE = require(global.gBaseDir + "/package.json");

var shutil = require(global.gBaseDir + "/src/shutil.js");
/*jslint stupid: true */
// OK as this is only called once during startup
function serverInfo() {
  var serverInfoFn = global.configBase + "/server.json";
  var serverData = {};
  if (!fs.existsSync(serverInfoFn)) {
    serverData.serverId = shutil.uuid();
    fs.writeFileSync(serverInfoFn, JSON.stringify(serverData));
  } else {
    serverData = require(serverInfoFn);
  }
  return serverData;
}
global.server = serverInfo();

var shlog = require(global.gBaseDir + "/src/shlog.js");
if (cluster.isMaster) {
  shlog.info("loaded:", new Date());
  shlog.info("server:", global.server);
  shlog.info("configBase:", global.configBase);
  shlog.info("config:", global.C);
}

var shCluster = require(global.gBaseDir + "/src/shcluster.js");
var shelly = require(global.gBaseDir + "/src/shelly.js");
var mailer = require(global.gBaseDir + "/src/shmailer.js");
var matcher = require(global.gBaseDir + "/src/shmatcher.js");
var socket = require(global.gBaseDir + "/src/socket.js");

var gStats = {};

// SWD: this need to moved to a config file
global.games = {};
global.games.tictactoe = {minPlayers: 2, maxPlayers: 2, created: 0, lastCreated: 0, url: "/tictactoe/tictactoe.html"};
global.games.connect4 = {minPlayers: 2, maxPlayers: 2, created: 0, lastCreated: 0, url: "/connect4/connect4.html"};

// master received message from worker
function onWorkerMessage(msg) {
  shlog.debug("master recv: %j", msg);

  if (msg.cmd === "stat") {
    shCluster.setStat(msg.key, msg.wid, msg.count);
    return;
  }

  if (msg.toWid === "all") {
    // forward to all workers, except sender
    _.each(cluster.workers, function (worker, wid) {
      if (parseInt(wid, 10) !== msg.wid) {
        worker.process.send(msg);
      }
    });
  } else {
    // forward just to workerId
    cluster.workers[msg.toWid].send(msg);
  }
}

shCluster.init(function (err, data) {
  if (err) {
    shlog.error("unable to start shcluster module");
    return;
  }
  if (cluster.isMaster) {
    var i = 0;
    var p = null;
    for (i = 0; i < global.C.NUM_WORKERS; i += 1) {
      p = cluster.fork({WTYPE: "shelly"});
      p.on("message", onWorkerMessage);
    }
    // fork a mail processor
    if (global.C.EMAIL_QUEUE) {
      p = cluster.fork({WTYPE: "mailer"});
      p.on("message", onWorkerMessage);
    }
    // fork a match processor
    // SWD: should these just fork the shmatcher module directly
    // SWD: loop this over the global matchInfo
    _.each(global.games, function (gameInfo, gameName) {
      p = cluster.fork({WTYPE: "matcher", GAMENAME: gameName});
      p.on("message", onWorkerMessage);
    });
  } else {
    if (process.env.WTYPE === "mailer") {
      shlog.info("starting mailer");
      mailer.start();
    } else if (process.env.WTYPE === "matcher") {
      shlog.info("starting matcher:", process.env.GAMENAME);
      matcher.start(process.env.GAMENAME);
    } else if (process.env.WTYPE === "shelly") {
      shlog.info("starting shelly");
      shelly.start();
    }
  }
});

// receive message from master
process.on("message", function (msg) {
  shlog.debug("onMessage: %j", msg);
  if (msg.cmd === "user.direct") {
    socket.sendDirect(msg.toWsid, msg.data);
    return;
  }
  shlog.error("bad_message", "unknown command", msg);
});

cluster.on("online", function (worker) {
  shlog.debug("worker online:", worker.id);
});

cluster.on("disconnect", function (worker) {
  shlog.debug("worker disconnect:", worker.id);
});

cluster.on("exit", function (worker) {
  shlog.debug("worker exit:", worker.id);
});

// listen for these also to unreg the server
process.on("uncaughtException", function (error) {
  shlog.error("uncaughtException", error.stack);
});

function shutdown() {
  if (cluster.isMaster) {
    shlog.info("master SIGINT - graceful shutdown");
    // waits for all client processes to end
    shCluster.masterShutdown();
  }
  if (process.env.WTYPE === "mailer") {
    shlog.info("shutdown mailer");
    mailer.shutdown(function (err) {
      shCluster.shutdown();
    });
  } else if (process.env.WTYPE === "matcher") {
    shlog.info("shutdown matcher:", process.env.GAMENAME);
    matcher.shutdown(function (err) {
      shCluster.shutdown();
    });
  } else if (process.env.WTYPE === "shelly") {
    shlog.info("shutdown shelly");
    shelly.shutdown(function (err) {
      shCluster.shutdown();
    });

  }
}

process.on("SIGINT", function () {
  shutdown();
});

process.on("SIGQUIT", function () {
  shutdown();
});