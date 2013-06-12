var fs = require("fs");
var uuid = require("node-uuid");

var shutil = require(__dirname + "/shutil.js");
var shlog = require(__dirname + "/shlog.js");

// sync ok - only done on cluster startup

var ShCluster = exports;

ShCluster.init = function (cb) {
  var clusterInfoFn = __dirname + "/../config/cluster.json";
  var clusterInfo = {};
  if (!fs.existsSync(clusterInfoFn)) {
    clusterInfo.clusterId = shutil.uuid();
    fs.writeFile(clusterInfoFn, JSON.stringify(clusterInfo), function (err) {
      if (err) {
        console.log(err);
      } else {
        console.log("The file was saved!");
      }
      return cb(err, clusterInfo);
    });
  } else {
    clusterInfo = require(clusterInfoFn);
  }

  global.cluster = clusterInfo;
  console.log(global.cluster);
  return cb(0, clusterInfo);
};