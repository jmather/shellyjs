var express = require("express");
var os = require("os");
var fs = require("fs");
var path = require("path");
var engines = require("consolidate");

var shlog = require(global.gBaseDir + "/src/shlog.js");

var gAdminPort = 5100;
var adminBase = global.gBaseDir + "/admin";
var adminStatic = adminBase + "/static";
var adminGames = adminBase + "/games";

// SWD move to config module
var gRestUrl = "http://localhost:5101/api";
var gSocketUrl = "http://localhost:5102/api";
if (os.hostname() === "ip-10-174-177-87") {
  gRestUrl = "http://dev2.skool51.com:5101/api";
  gSocketUrl = "http://dev2.skool51.com:5102/api";
}

shlog.info("admin directory: " + adminBase);
shlog.info("admin static directory: " + adminStatic);

var app = express();
//app.use(express.basicAuth(function(user, pass){
//  return "scott" == user & "foo" == pass;
//}));
app.use(express.favicon(adminStatic + "/images/favicon.ico"));
app.use("/static", express.static(adminStatic));
app.use("/games", express.static(adminGames));

//app.enable("view cache");  // disable this for dev
app.set("views", adminBase);
app.engine("html", engines.hogan);

app.get("/menu_1.html", function (req, res) {
  shlog.info("in menu_1");
  var cmdFile = global.gBaseDir + "/functions/module/module.js";
  delete require.cache[require.resolve(cmdFile)];
  var modulePack = require(cmdFile);
  var map = {};
  map.user = "Scott";
  modulePack.list(req, res, function (err, data) {
    map.modules = JSON.stringify(data);
    res.render(path.basename(req.url), map);
  });
});

app.get("/testgame.html", function (req, res) {
  shlog.info("in testgame");
  var map = {};
  map.module = "game";
  var cmdFile = global.gBaseDir + "/functions/" + map.module + "/" + map.module + ".js";
  delete require.cache[require.resolve(cmdFile)];
  var modulePack = require(cmdFile);
  map.functions = modulePack.functions;
  res.render("testgame.html", {params: JSON.stringify(map)});
});

app.get("/function/:module/:function", function (req, res) {
  var map = {};
  map.restUrl = gRestUrl;
  map.socketUrl = gSocketUrl;
  map.module = req.param("module");
  map.function = req.param("function");
  var cmdFile = global.gBaseDir + "/functions/" + map.module + "/" + map.module + ".js";
  delete require.cache[require.resolve(cmdFile)];
  var modulePack = require(cmdFile);
  map.functions = modulePack.functions;
  map.desc = modulePack.desc;
  res.render("function.html", {params: JSON.stringify(map)});
});

app.get("*.html", function (req, res) {
  shlog.info("%s %s", req.method, req.url);
  res.render(path.basename(req.url), {});
});

var adminServer = app.listen(gAdminPort);
shlog.info("Admin server started on port %d", adminServer.address().port);