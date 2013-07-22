var cluster = require("cluster");
var path = require("path");
var os = require("os");
var fs = require("fs");

var _ = require("lodash");
var async = require("async");

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

global.db = require(global.gBaseDir + "/src/shdb.js");
global.socket = null;

var gChannel = require(global.gBaseDir + "/functions/channel2/channel2.js");

var shelly = exports;

var admin = null;
var rest = null;
var games = null;

shelly.start = function () {
  // handle all the exit cases
  process.on("uncaughtException", function (error) {
    shlog.error("uncaughtException", error.stack);
  });

  process.on("SIGINT", function () {
    // ignore as master process sends shutdown message and waits
  });

  process.on("SIGQUIT", function () {
    // ignore as master process sends shutdown message and waits
  });

  shlog.info("starting db");
  global.db.init(function (err) {
    if (!err) {
      shlog.info("starting web and socket");

      admin = require(global.gBaseDir + "/src/admin.js");
      rest = require(global.gBaseDir + "/src/rest.js");
      games = require(global.gBaseDir + "/src/games.js");

      global.socket = require(global.gBaseDir + "/src/socket.js");
      global.socket.start();
    } else {
      shlog.error("unable to start db", err);
      process.exit(1);
    }
  });
};

shelly.shutdown = function () {
  async.series([
    function (cb) {
      if (admin) {
        shlog.info("shutting down admin");
        admin.close();
        admin = null;
      }
      if (rest) {
        shlog.info("shutting down rest");
        rest.close();
        rest = null;
      }
      if (games) {
        shlog.info("shutting down games");
        games.close();
        games = null;
      }
      if (global.socket) {
        shlog.info("shutting down socket");
        global.socket.close(function () { global.socket = null; cb(0); });
      } else { cb(0); }
    },
    function (cb) {
      if (global.db) {
        shlog.info("shutting down db");
        global.db.close(function () {
          global.db = null;
          cb(0);
        });
      } else { cb(0); }
    }
  ],
    function (err, results) {
      shlog.info("done.");
      process.exit(0);
    });
};

shelly.onMessage = function (msg) {
  shlog.debug("onMessage: %j", msg);
  if (msg.cmd === "user.direct") {
    gChannel.sendDirect(msg.toWsid, msg.data);
    return;
  }
  if (msg.cmd === "shelly.stop") {
    this.shutdown();
    return;
  }
  shlog.error("bad_message", "unknown command", msg);
};