var express = require("express");
var os = require("os");
var fs = require("fs");
var path = require("path");
var url = require("url");
var engines = require("consolidate");
var _ = require("lodash");

var shlog = require(global.gBaseDir + "/src/shlog.js");
var sh = require(global.gBaseDir + "/src/shutil.js");
var ShLoader = require(global.gBaseDir + "/src/shloader.js");

var commonStatic = global.gBaseDir + "/www/common";
var gamesBase = global.gBaseDir + "/www/games";
var gamesStatic = gamesBase + "/static";
var gamesLogin = gamesBase + "/login";

shlog.info("games directory: " + gamesBase);

var app = express();
app.use(express.favicon(gamesStatic + "/images/favicon.ico"));
//app.enable("view cache");  // disable this for dev
app.set("views", gamesBase);
app.engine("html", engines.hogan);
app.use("/common", express.static(commonStatic));
app.use("/static", express.static(gamesStatic));
app.use(express.cookieParser());
app.use(function (req, res, next) {
  if (req.path.substring(0, 7) === "/login/") {
    return next();
  }

  shlog.info("session check", req.path);
  if (_.isUndefined(req.cookies.shSession)) {
    shlog.info("redirect - no session");
    res.redirect("/login/index.html");
    return 0;
  }
  shlog.info("found cookie shSession: ", req.cookies.shSession);

  // there is no dump and these page do not modify objects
  req.loader = new ShLoader();
  sh.fillSession(req.cookies.shSession, req, res, function (error, data) {
    if (error) {
      shlog.info("redirect - bad session");
      res.redirect("/login/index.html");
      return 0;
    }
    req.loader.dump();
    return next();
  });

  return 0;
});

app.get("/login/*.html", function (req, res) {
  shlog.info("in login", req.url);
  var env = {};
  env.version = global.PACKAGE.version;
  env.token = req.cookies.shToken;
  env.restUrl = global.CONF.restUrl;
  env.socketUrl = global.CONF.socketUrl;
  env.nextUuid = sh.uuid();
  res.render(req.url.substring(1), {Env: env, EnvJson: JSON.stringify(env),
    partials: {header: "header", footer: "footer"}});

  return 0;
});

function createEnv(req) {
  var map = {};
  map.version = global.PACKAGE.version;
  map.gamesUrl = global.CONF.gamesUrl;
  map.restUrl = global.CONF.restUrl;
  map.socketUrl = global.CONF.socketUrl;
  map.user = req.session.user.getData();
  map.session = req.cookies.shSession;
  map.token = req.cookies.shToken;
  return map;
}

app.get("*.html", function (req, res) {
  shlog.info("%s %s", req.method, req.url);
  var env = createEnv(req);

  res.render(url.parse(req.url).pathname.substring(1), {Env: env, EnvJson: JSON.stringify(env),
    partials: {header: "header", footer: "footer", gameNav: "gamenav"}});
});

app.use("/", express.static(gamesBase));  // catch all for any example js files

app.use("/", function (req, res) {
  shlog.info("default handler - goto lobby");
  res.redirect("/lobby.html");
  return 0;
});

//********** error handling

app.use(function (err, req, res, next) {
  shlog.error("game error", err, err.stack);
  var env = createEnv(req);
  env.error = {message: err.message, stack: err.stack};

  res.status(500);
  res.render("error.html", {Env: env, EnvJson: JSON.stringify(env),
    partials: {header: "header", footer: "footer", adminNav: "gamenav"}});
});


//********** server init and handlers

var gameServer = app.listen(global.CONF.gamesPort, function () {
  shlog.info("game server listening: %d", gameServer.address().port);
});

gameServer.on("error", function (err) {
  shlog.error(err);
});

exports.close = function (cb) {
  if (gameServer.address()) {
    gameServer.close(cb);
    return;
  }
  cb();
};