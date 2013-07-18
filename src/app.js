var cluster = require("cluster");
var _ = require("lodash");

// need shelly before log - this inits all config and other globals
var shelly = require(__dirname + "/shelly.js");
var shlog = require(global.gBaseDir + "/src/shlog.js");

var shCluster = require(global.gBaseDir + "/src/shcluster.js");

var gStats = {};

// SWD: this need to moved to a config file
global.matchInfo = {};
global.matchInfo.tictactoe = {minPlayers: 2, maxPlayers: 2, created: 0, lastCreated: 0, url: "/tictactoe/tictactoe.html"};
global.matchInfo.connect4 = {minPlayers: 2, maxPlayers: 2, created: 0, lastCreated: 0, url: "/connect4/index.html"};

// master received message from worker
function onWorkerMessage(msg) {
  shlog.info("master recv: %j", msg);

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

if (cluster.isMaster) {
  shCluster.init(function (err, data) {
    var i = 0;
    for (i = 0; i < global.C.NUM_WORKERS; i += 1) {
      var p = cluster.fork();
      p.on("message", onWorkerMessage);
    }
  });
} else {
  shelly.start();
}

// receive message from master
process.on("message", function (msg) {
  shelly.onMessage(msg);
});

cluster.on("online", function (worker) {
  shlog.info("worker online:", worker.id);
});

cluster.on("disconnect", function (worker) {
  shlog.info("worker disconnect:", worker.id);
});

cluster.on("exit", function (worker) {
  shlog.info("worker exit:", worker.id);
});

if (cluster.isMaster) {
  // listen for these also to unreg the server
  process.on("uncaughtException", function (error) {
    shlog.error("master uncaughtException", error.stack);
  });

  process.on("SIGINT", function () {
    shlog.info("master SIGINT - graceful shutdown");
    shCluster.shutdown();
  });

  process.on("SIGQUIT", function () {
    shlog.info("master SIGQUIT - graceful shutdown");
    shCluster.shutdown();
  });
}