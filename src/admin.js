var express = require("express");
var os = require("os");
var fs = require("fs");
var path = require("path");
var url = require("url");
var engines = require("consolidate");
var _ = require("lodash");

var shlog = require(global.gBaseDir + "/src/shlog.js");
var sh = require(global.gBaseDir + "/src/shutil.js");

var adminBase = global.gBaseDir + "/admin";
var adminStatic = adminBase + "/static";
var adminGames = adminBase + "/games";
var adminLogin = adminBase + "/login";

shlog.info("admin directory: " + adminBase);
shlog.info("admin static directory: " + adminStatic);

var app = express();
//app.use(express.basicAuth(function(user, pass){
//  return "scott" == user & "foo" == pass;
//}));
app.use(express.favicon(adminStatic + "/images/favicon.ico"));
//app.enable("view cache");  // disable this for dev
app.set("views", adminBase);
app.engine("html", engines.hogan);

app.use("/static", express.static(adminStatic));  // must be here so static files don't go through session check

app.use(express.cookieParser());
app.use(function (req, res, next) {
  if (req.path.substring(0, 7) === "/login/") {
    return next();
  }

  shlog.info("session check", req.path);

  // SWD little clunky to deal with express vs restify diffs
  req.params = {};
  req.params.cmd = "admin.page";
  if (_.isUndefined(req.cookies.ShSession)) {
    shlog.info("redirect - no session");
    res.redirect("/login/index.html");
    return 0;
  }
  req.params.session = req.cookies.ShSession;
  // SWD req.params is reset when routes fire
  shlog.info("found cookie ShSession: ", req.cookies.ShSession);
//  req.params.session = "1:41:xxxx:0";

  sh.fillSession(req, res, function (error, data) {
    if (error) {
      shlog.info("redirect - bad session");
      res.redirect("/login/index.html");
      return 0;
    }
    return next();
  });

  return 0;
});

app.get("/login/*.html", function (req, res) {
  shlog.info("in login", req.url);
  var map = {};
  map.restUrl = global.CONF.restUrl;
  map.socketUrl = global.CONF.socketUrl;
  map.nextUuid = sh.uuid();
  res.render(req.url.substring(1), {params: JSON.stringify(map)});
  return 0;
});

app.get("/core.html", function (req, res) {
  shlog.info("in: " + req.url);
  var cmdFile = global.gBaseDir + "/functions/module/module.js";
  delete require.cache[require.resolve(cmdFile)];
  var modulePack = require(cmdFile);
  var map = {};
  map.version = global.PACKAGE.version;
  map.restUrl = global.CONF.restUrl;
  map.socketUrl = global.CONF.socketUrl;
  map.user = req.session.user.getData();
  map.session = req.cookies.ShSession;
  modulePack.list(req, res, function (err, data) {
    map.modules = data;
    res.render(path.basename(req.url), {Env: map, EnvJson: JSON.stringify(map),
      partials: {header: 'header', adminNav: 'adminnav'}});
  });
});

app.get("*.html", function (req, res) {
  shlog.info("%s %s", req.method, req.url);
  var map = {};
  map.version = global.PACKAGE.version;
  map.restUrl = global.CONF.restUrl;
  map.socketUrl = global.CONF.socketUrl;
  map.nextUuid = sh.uuid();
  map.user = req.session.user.getData();
  map.session = req.cookies.ShSession;
  res.render(url.parse(req.url).pathname.substring(1), {Env: map, EnvJson: JSON.stringify(map),
    partials: {header: 'header', adminNav: 'adminnav', gameNav: 'gamenav'}});
});

app.use("/login", express.static(adminLogin));  // catch all for logout.html and script.js
app.use("/games", express.static(adminGames));  // catch all for any other game files

var adminServer = app.listen(global.CONF.adminPort);
shlog.info("admin server listening: %d", adminServer.address().port);