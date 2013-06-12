var cluster = require("cluster");
var _ = require("lodash");

// need shelly before log - SWD change this depend
var shelly = require(__dirname + "/shelly.js");
var shlog = require(global.gBaseDir + "/src/shlog.js");

var shCluster = require(global.gBaseDir + "/src/shcluster.js");

// received message from worker
function workerMessage(msg) {
  shlog.info("master recv:", JSON.stringify(msg));

  // SWD must adjust socket   connect and close to set cluster ID and server IP
  // check to see if it's a global channel
  // if so check if the user is on another cluster
  // if so send to that cluster

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
    for (i = 0; i < 2; i++) {
      var p = cluster.fork();
      p.on("message", workerMessage);
    }
  });
} else {
  shCluster.init(function (err, data) {
    if (!err) {
      shelly.start();
    } else {
      shlog.error("unable to initialise the cluster", err, data);
    }
  });
}

// receive master message
process.on("message", function (msg) {
  shlog.info("worker recv:", JSON.stringify(msg));
  shelly.send(msg);
});

cluster.on("online", function (worker) {
  shlog.info("worker online:", worker.id);
});

cluster.on("disconnect", function (worker) {
  shlog.info("worker disconnect:", worker.id);
});

cluster.on("exit", function (worker) {
  shlog.info("worker disconnect:", worker.id);
});
