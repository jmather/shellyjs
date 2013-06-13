var path = require("path");
var os = require("os");
var fs = require("fs");

var _ = require("lodash");
var async = require("async");

global.gBaseDir = path.dirname(__dirname);

// load configs with per machine overrides
global.CONF = require(global.gBaseDir + "/config/main.js");
var machineConfigFn = global.gBaseDir + "/config/" + os.hostname() + ".js";
/*jslint stupid: true */
if (fs.existsSync(machineConfigFn)) {
  try {
    global.CONF = _.merge(global.CONF, require(machineConfigFn));
  } catch (e) {
    console.error("error: unable to load config file:", os.hostname() + ".js");
    process.exit(1);
  }
}

global.PACKAGE = require(global.gBaseDir + "/package.json");
var clusterInfoFn = global.gBaseDir + "/config/cluster.json";
if (fs.existsSync(clusterInfoFn)) {
  global.cluster = require(clusterInfoFn);
} else {
  global.cluster = {clusterId: "0"};
}

var shlog = require(global.gBaseDir + "/src/shlog.js");
shlog.info("loaded:", new Date());
shlog.info("config:", global.CONF);

global.db = require(global.gBaseDir + "/src/shdb.js");
global.socket = null;

var gChannel = require(global.gBaseDir + "/functions/channel/channel.js");

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
    shlog.info("SIGINT - graceful shutdown");
    shelly.shutdown();
  });

  process.on("SIGQUIT", function () {
    shlog.info("SIGQUIT - graceful shutdown");
    shelly.shutdown();
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

shelly.send = function (msg) {
  if (msg.cmd === "who.query") {
    gChannel.returnOnline(msg.channel, msg.wid, msg.fromWsid);
    return;
  }
  if (msg.cmd === "who.return") {
    gChannel.sendDirect(msg.toWsid, msg.data);
    return;
  }
  if (msg.cmd === "forward") {
    gChannel.sendInt(msg.channel, msg.data, false); // do not forward to cluster
    return;
  }
};