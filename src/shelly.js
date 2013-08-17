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

// number of times SIGINT or SIGQUIT called
var gKillCount = 0;

var sh = require(global.gBaseDir + "/src/shutil.js");
/*jslint stupid: true */
// OK as this is only called once during startup
function serverInfo() {
  var serverInfoFn = global.configBase + "/server.json";
  var serverData = {};
  if (fs.existsSync(serverInfoFn)) {
    serverData = require(serverInfoFn);
  } else {
    serverData.serverId = sh.uuid();
    fs.writeFileSync(serverInfoFn, JSON.stringify(serverData));
  }
  return serverData;
}
global.server = serverInfo();
global.shutdown = false;

var shlog = require(global.gBaseDir + "/src/shlog.js");
if (cluster.isMaster) {
  shlog.info("shelly", "loaded:", new Date());
  shlog.info("shelly", "server:", global.server);
  shlog.info("shelly", "configBase:", global.configBase);
  shlog.info("shelly", "config:", sh.secure(global.C));
}

require(global.gBaseDir + "/src/shcb.js").leanStacks(true);

var shCluster = require(global.gBaseDir + "/src/shcluster.js");
var gWorkerModule = null;

var mailer = require(global.gBaseDir + "/src/shmailer.js");
var matcher = require(global.gBaseDir + "/src/shmatcher.js");
var rest = null;
var admin = null;
var games = null;
global.socket = require(global.gBaseDir + "/src/socket.js");

// SWD: this need to moved to a config file
global.games = {};
global.games.tictactoe = {minPlayers: 2, maxPlayers: 2, created: 0, lastCreated: 0, url: "/tictactoe/tictactoe.html"};
global.games.connect4 = {minPlayers: 2, maxPlayers: 2, created: 0, lastCreated: 0, url: "/connect4/connect4.html"};

// master received message from worker
function onWorkerMessage(msg) {
  shlog.debug("shelly", "master recv: %j", msg);

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

// avoids function in loop
function startMatcher(gameInfo, gameName) {
  var p = cluster.fork({WTYPE: "matcher", GAMENAME: gameName});
  p.on("message", onWorkerMessage);
}

shCluster.init(function (err, data) {
  if (err) {
    shlog.error("shelly", "unable to start shcluster module", err, data);
    return;
  }
  if (cluster.isMaster) {
    _.each(global.C.CLUSTER, function (info, name) {
      var i = 0;
      for (i = 0; i < info.num; i += 1) {
        var p = cluster.fork({WTYPE: name});
        p.on("message", onWorkerMessage);
      }
    });
  } else {
    shlog.info("shelly", "starting:", process.env.WTYPE);
    var workerInfo = global.C.CLUSTER[process.env.WTYPE];
    gWorkerModule = require(global.gBaseDir + workerInfo.src);
    gWorkerModule.start.apply(gWorkerModule, workerInfo.args);
  }
});

// receive message from master
process.on("message", function (msg) {
  shlog.debug("shelly", "onMessage: %j", msg);
  if (msg.cmd === "user.direct") {
    if (process.env.WTYPE !== "socket") {
      shlog.error("shelly", "non-socket got a sendDirect", msg);
      return;
    }
    global.socket.sendDirect(msg.toWsid, msg.data);
    return;
  }
  shlog.error("shelly", "bad_message", "unknown command", msg);
});

cluster.on("online", function (worker) {
  shlog.debug("shelly", "worker online:", worker.id);
});

cluster.on("disconnect", function (worker) {
  shlog.debug("shelly", "worker disconnect:", worker.id);
});

cluster.on("exit", function (worker) {
  shlog.debug("shelly", "worker exit:", worker.id);
});

// listen for these also to unreg the server
process.on("uncaughtException", function (error) {
  shlog.error("shelly", "uncaughtException", error.stack);
});

function shutdown() {
  global.shutdown = true;

  if (cluster.isMaster) {
    shlog.info("shelly", "master SIGINT - graceful shutdown");
    // waits for all client processes to end
    shCluster.masterShutdown();
    return;
  }

  if (gWorkerModule) {
    gWorkerModule.shutdown(function () {
      shlog.info("shelly", "shutdown:", process.env.WTYPE);
      shCluster.shutdown();
    });
  } else {
    shCluster.shutdown();
  }
}

process.on("SIGINT", function () {
  if (gKillCount < 1) {
    gKillCount += 1;
    shutdown();
  } else {
    process.exit();
  }
});

process.on("SIGQUIT", function () {
  if (gKillCount < 1) {
    gKillCount += 1;
    shutdown();
  } else {
    process.exit();
  }
});