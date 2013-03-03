// all constants up front for requires
var gPort = 5101;
global.gBaseDir = "/Users/scott/git/shelly";

var util = require("util");
var http = require("http");
var restify = require("restify");
var _ = require("lodash");

// do first so any of our modules can use
global.db = require(global.gBaseDir + "/src/shdb.js");

var shlog = require(global.gBaseDir + "/src/shlog.js");
var sh = require(global.gBaseDir + "/src/shutil.js");
var session = require(global.gBaseDir + "/src/session.js");

var admin = require(global.gBaseDir + "/src/admin.js");

global.live = require(global.gBaseDir + "/src/live.js");
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
/*
 server.use(
 function crossOrigin(req,res,next){
 res.header("Access-Control-Allow-Origin", "*");
 res.header("Access-Control-Allow-Headers", "X-Requested-With");
 return next();
 }
 );
 */
server.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  return next();
});

server.use(function (req, res, next) {
  shlog.info("session check");
  var cmd = req.params.cmd;
  if (cmd === "reg.login" || cmd === "reg.create" || cmd === "reg.check") {
    return next();
  }

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

server.listen(gPort, function () {
  shlog.info("%s listening at %s", server.name, server.url);
});