var cluster = require("cluster");
var _ = require("lodash");

// need shelly before log - SWD change this depend
var shelly = require(__dirname + "/shelly.js");
var shlog = require(global.gBaseDir + "/src/shlog.js");

// receive worker message
function workerMessage(msg) {
  shlog.info("master recv:", JSON.stringify(msg));

  // forward to all workers, except sender
  if (msg.toWid === "all") {
    _.each(cluster.workers, function (worker, wid) {
      if (parseInt(wid, 10) !== msg.wid) {
        worker.process.send(msg);
      }
    });
  } else {
    cluster.workers[msg.toWid].send(msg);
  }
}

if (cluster.isMaster) {
  var i = 0;
  for (i = 0; i < 2; i++) {
    var p = cluster.fork();
    p.on("message", workerMessage);
  }
} else {
//  var shelly = require(__dirname + "/shelly.js");
  shelly.start();
}

// receive master message
process.on("message", function (msg) {
  shlog.info("worker recv:", JSON.stringify(msg));
  shelly.send(msg);
});

cluster.on("online", function (worker) {
  console.log("worker online:", worker.id);
});

cluster.on("disconnect", function (worker) {
  console.log("worker disconnect:", worker.id);
});

cluster.on("exit", function (worker) {
  console.log("worker disconnect:", worker.id);
});
