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
var _w = require(global.gBaseDir + "/src/shcb.js")._w;

var commonStatic = global.gBaseDir + "/www/common";
var adminBase = global.gBaseDir + "/www/admin";
var adminStatic = adminBase + "/static";
var adminLogin = adminBase + "/login";

shlog.info("admin", "admin directory: " + adminBase);

// ensure admin user
var reg = require(global.gBaseDir + "/functions/reg/reg.js");
var loader = new ShLoader();
reg.verifyUser(loader, global.C.DEFAULT_ADMIN_NAME, global.C.DEFAULT_ADMIN_PASSWORD, function (error, data) {
  if (error) {
    shlog.error("admin", "unable to load or create default admin", data);
  }
  loader.dump();
});

var app = express();
app.use(express.favicon(adminStatic + "/images/favicon.ico"));
//app.enable("view cache");  // disable this for dev
app.set("views", adminBase);
app.engine("html", engines.hogan);
app.use("/common", express.static(commonStatic));
app.use("/static", express.static(adminStatic));
app.use(express.cookieParser());

app.use(function (req, res, next) {
  if (req.path.substring(0, 7) === "/login/"
      || req.path.substring(0, 8) === "/static/") {
    return next();
  }

  shlog.info("admin", "session check", req.path);

  // SWD little clunky to deal with express vs restify diffs
  req.body = {};
  req.body.cmd = "admin.page";
  if (_.isUndefined(req.cookies.shSession)) {
    shlog.info("admin", "redirect - no session");
    res.redirect("/login/index.html");
    return 0;
  }
  shlog.info("admin", "found cookie shSession: ", req.cookies.shSession);

  req.loader = new ShLoader();
  sh.fillSession(req.cookies.shSession, req, res, _w(next, function (error, data) {
    if (error) {
      shlog.info("admin", "redirect - bad session");
      res.redirect("/login/index.html");
      return 0;
    }
    // double check the role
    if (!_.contains(req.session.user.get("roles"), "admin")) {
      shlog.info("admin", "redirect - user does not have admin role", req.session.user.get("roles"));
      res.redirect("/login/index.html");
      return 0;
    }
    req.loader.dump(next);
  }));

  return 0;
});

app.get("/login/*.html", function (req, res) {
  shlog.info("admin", "in login", req.url);
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
  map.user = req.session.user.getData();
  map.session = req.cookies.shSession;
  map.token = req.cookies.shToken;
  return map;
}

app.get("*.html", function (req, res) {
  shlog.info("admin", "%s %s", req.method, req.url);
  var env = createEnv(req);

  res.render(url.parse(req.url).pathname.substring(1), {Env: env, EnvJson: JSON.stringify(env),
    partials: {header: "header", footer: "footer", adminNav: "adminnav"}});
});

app.use("/login", express.static(adminLogin));  // catch all for logout.html and script.js

app.use("/", function (req, res) {
  shlog.info("admin", "default handler - default page");
  res.redirect("/index.html");
  return 0;
});

//********** error handling

app.use(function (err, req, res, next) {
  shlog.error("admin", "admin error", err, err.stack);
  var env = createEnv(req);
  env.error = {message: err.message, stack: err.stack};

  res.status(500);
  res.render("error.html", {Env: env, EnvJson: JSON.stringify(env),
    partials: {header: "header", footer: "footer", adminNav: "adminnav"}});

  return 0;
});


//********** server init and handlers

var adminServer = null;
exports.start = function () {
  var adminServer = app.listen(global.C.ADMIN_PORT, function () {
    shlog.system("admin", "server listening: %s", global.C.ADMIN_URL);
  });

  adminServer.on("error", function (err) {
    shlog.error("admin", err);
  });
};

exports.shutdown = function (cb) {
  if (adminServer && adminServer.address()) {
    adminServer.close();
  }
  cb();
};