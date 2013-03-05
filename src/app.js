// all constants up front for requires
var path = require("path");
global.gBaseDir = path.dirname(path.dirname(process.mainModule.filename));
var os = require("os");
try {
  global.CONF = require(global.gBaseDir + "/config/" + os.hostname() + ".js");
} catch (e) {
  console.error("error: unable to load config file:", os.hostname() + ".js");
  process.exit(1);
}
global.PACKAGE = require(global.gBaseDir + "/package.json");

var util = require("util");
var http = require("http");
var restify = require("restify");
var _ = require("lodash");

var shlog = require(global.gBaseDir + "/src/shlog.js");
shlog.info(global.CONF);

// do first so any of our modules can use
global.db = require(global.gBaseDir + "/src/shdb.js");
var sh = require(global.gBaseDir + "/src/shutil.js");
var session = require(global.gBaseDir + "/src/session.js");
var admin = require(global.gBaseDir + "/src/admin.js");
global.live = require(global.gBaseDir + "/src/socket.js");
global.live.start();

var server = restify.createServer({
  name: "shelly"
});
server.use(restify.acceptParser(server.acceptable));
//server.use(restify.authorizationParser());
//server.use(restify.dateParser());
//server.use(restify.queryParser());
//server.use(restify.bodyParser());
/*
 server.use(restify.throttle({
 burst: 100,
 rate: 50,
 ip: true, // throttle based on source ip address
 overrides: {
 "127.0.0.1": {
 rate: 0, // unlimited
 burst: 0
 }
 }
 }));
 */
server.use(restify.bodyParser());

server.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  return next();
});

server.use(function (req, res, next) {
  shlog.info("session check");

  sh.fillSession(req, res, function (error, data) {
    if (error !== 0) {
      res.send(data);
      return 0;
    }
    return next();
  });

  return 0;
});

server.get("/hello", function (req, res, next) {
  res.send("hello");
  return next();
});

function respond(req, res, next) {
  _.isFunction(next);  // end of line so never gets called;

  var cmd = req.params.cmd;

  shlog.recv("rest - %s", JSON.stringify(req.params));
  sh.call(cmd, req, res, function (error, data) {
    shlog.send(error, "rest - %s", JSON.stringify(data));
    res.send(data);
  });
}

server.post("/api", respond);
server.post("/api/:version", respond);

server.listen(global.CONF.restPort, function () {
  shlog.info("rest server listening: %s", global.CONF.restPort);
});