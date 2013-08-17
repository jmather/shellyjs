var express = require("express");
var os = require("os");
var fs = require("fs");
var path = require("path");
var url = require("url");
var engines = require("consolidate");
var _ = require("lodash");

var shlog = require(global.C.BASEDIR + "/src/shlog.js");
var sh = require(global.C.BASEDIR + "/src/shutil.js");
var ShLoader = require(global.C.BASEDIR + "/src/shloader.js");
var _w = require(global.C.BASEDIR + "/src/shcb.js")._w;

var commonStatic = global.C.BASEDIR + "/www/common";
var gamesBase = global.C.BASEDIR + "/www/games";
var gamesStatic = gamesBase + "/static";

shlog.info("games", "games directory: " + gamesBase);

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

  shlog.info("games", "session check", req.path);
  if (_.isUndefined(req.cookies.shSession)) {
    shlog.info("games", "redirect - no session");
    res.redirect("/login/index.html");
    return 0;
  }
  shlog.info("games", "found cookie shSession: ", req.cookies.shSession);

  // there is no dump and these page do not modify objects
  req.loader = new ShLoader();
  sh.fillSession(req.cookies.shSession, req, res, _w(next, function (error, data) {
    if (error) {
      shlog.info("games", "redirect - bad session");
      res.redirect("/login/index.html");
      return 0;
    }
    req.loader.dump(next);
  }));

  return 0;
});

app.get("/login/*.html", function (req, res) {
  shlog.info("games", "in login", req.url);
  var env = {};
  env.version = global.PACKAGE.version;
  env.token = req.cookies.shToken;
  env.restUrl = global.C.REST_URL;
  env.socketUrl = global.C.SOCKET_URL;
  env.nextUuid = sh.uuid();
  res.render(req.url.substring(1), {Env: env, EnvJson: JSON.stringify(env),
    partials: {header: "header", footer: "footer"}});

  return 0;
});

function createEnv(req) {
  var map = {};
  map.version = global.PACKAGE.version;
  map.gamesUrl = global.C.GAMES_URL;
  map.restUrl = global.C.REST_URL;
  map.socketUrl = global.C.SOCKET_URL;
  map.session = req.cookies.shSession;
  map.token = req.cookies.shToken;
  map.games = global.games;
  map.user = req.session.user.getData();
  return map;
}

function renderPage(req, res, env) {
  res.render(url.parse(req.url).pathname.substring(1), {Env: env, EnvJson: JSON.stringify(env),
    partials: {header: "header", footer: "footer", gameNav: "gamenav", errorBox: "errorbox"}});
}

app.get("*.html", function (req, res) {
  shlog.info("games", "%s %s", req.method, req.url);
  var env = createEnv(req);
  renderPage(req, res, env);
});

app.use("/", express.static(gamesBase));  // catch all for any example js files

app.use("/", function (req, res) {
  shlog.info("games", "default handler - goto lobby");
  res.redirect("/home.html");
  return 0;
});

//********** error handling

app.use(function (err, req, res, next) {
  shlog.error("games", "game error", err, err.stack);
  var env = createEnv(req);
  env.error = {message: err.message, stack: err.stack};

  res.status(500);
  res.render("error.html", {Env: env, EnvJson: JSON.stringify(env),
    partials: {header: "header", footer: "footer", adminNav: "gamenav", errorBox: "errorbox"}});
});


//********** server init and handlers

var gameServer = null;
exports.start = function () {
  gameServer = app.listen(global.C.GAMES_PORT, function () {
    shlog.system("games", "server listening: %s", global.C.GAMES_URL);
  });

  gameServer.on("error", function (err) {
    shlog.error("games", err);
  });
};

exports.shutdown = function (cb) {
  if (gameServer && gameServer.address()) {
    gameServer.close();  // do not wait for close given keep-alives
  }
  cb();
};