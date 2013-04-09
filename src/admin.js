var express = require("express");
var os = require("os");
var fs = require("fs");
var path = require("path");
var url = require("url");
var engines = require("consolidate");
var _ = require("lodash");

var shlog = require(global.gBaseDir + "/src/shlog.js");
var sh = require(global.gBaseDir + "/src/shutil.js");

var adminBase = global.gBaseDir + "/www/admin";
var adminStatic = adminBase + "/static";
var adminLogin = adminBase + "/login";

shlog.info("admin directory: " + adminBase);

// ensure admin user
var reg = require(global.gBaseDir + "/functions/reg/reg.js");
reg.verifyUser(global.CONF.DEFAULT_ADMIN_NAME, global.CONF.DEFAULT_ADMIN_PASSWORD, function (error, data) {
  if (error) {
    shlog.error("unable to load or create default admin", data);
  }
});

var app = express();
app.use(express.favicon(adminStatic + "/images/favicon.ico"));
//app.enable("view cache");  // disable this for dev
app.set("views", adminBase);
app.engine("html", engines.hogan);
app.use("/static", express.static(adminStatic));  // must be here so static files don't go through session check
app.use(express.cookieParser());

app.use(function (req, res, next) {
  if (req.path.substring(0, 7) === "/login/"
      || req.path.substring(0, 8) === "/static/") {
    return next();
  }

  shlog.info("session check", req.path);

  // SWD little clunky to deal with express vs restify diffs
  req.body = {};
  req.body.cmd = "admin.page";
  if (_.isUndefined(req.cookies.shSession)) {
    shlog.info("redirect - no session");
    res.redirect("/login/index.html");
    return 0;
  }
  req.body.session = req.cookies.shSession;
  // SWD req.body is reset when rutes fire
  shlog.info("found cookie shSession: ", req.cookies.shSession);
//  req.body.session = "1:41:xxxx:0";

  sh.fillSession(req, res, function (error, data) {
    if (error) {
      shlog.info("redirect - bad session");
      res.redirect("/login/index.html");
      return 0;
    }
    // double check the role
    if (!_.contains(req.session.user.get("roles"), "admin")) {
      shlog.info("redirect - user does not have admin role", req.session.user.get("roles"));
      res.redirect("/login/index.html");
      return 0;
    }
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

app.get("/core.html", function (req, res) {
  shlog.info("%s %s", req.method, req.url);
  var env = createEnv(req);

  var cmdFile = global.gBaseDir + "/functions/module/module.js";
  delete require.cache[require.resolve(cmdFile)];
  var modulePack = require(cmdFile);
  modulePack.list(req, res, function (err, data) {
    env.modules = data;
    res.render(path.basename(req.url), {Env: env, EnvJson: JSON.stringify(env),
      partials: {header: "header", footer: "footer", adminNav: "adminnav"}});
  });
});

app.get("*.html", function (req, res) {
  shlog.info("%s %s", req.method, req.url);
  var env = createEnv(req);

  res.render(url.parse(req.url).pathname.substring(1), {Env: env, EnvJson: JSON.stringify(env),
    gBaseDir: global.gBaseDir,
    ConfigJson: JSON.stringify(global.CONF),
    PackageJson: JSON.stringify(global.PACKAGE),
    partials: {header: "header", footer: "footer", adminNav: "adminnav"}});
});

app.get("*.html", function (req, res) {
  shlog.info("%s %s", req.method, req.url);
  var env = createEnv(req);

  res.render(url.parse(req.url).pathname.substring(1), {Env: env, EnvJson: JSON.stringify(env),
    partials: {header: "header", footer: "footer", adminNav: "adminnav"}});
});

app.use("/login", express.static(adminLogin));  // catch all for logout.html and script.js


//********** error handling

app.use(function (err, req, res, next) {
  shlog.error("admin error", err, err.stack);
  var env = createEnv(req);
  env.error = {message: err.message, stack: err.stack};

  res.status(500);
  res.render("error.html", {Env: env, EnvJson: JSON.stringify(env),
    partials: {header: "header", footer: "footer", adminNav: "adminnav"}});
//  res.send(sh.error("admin_page", { error: err.message, stack: err.stack, error1: err.message }));
});


//********** server init and handlers

var adminServer = app.listen(global.CONF.adminPort, function () {
  shlog.info("admin server listening: %d", adminServer.address().port);
});

adminServer.on("error", function (err) {
  shlog.error(err);
});

exports.close = function (cb) {
  if (adminServer.address()) {
    adminServer.close(cb);
    return;
  }
  cb();
};