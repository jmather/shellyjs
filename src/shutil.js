var path = require("path");
var util = require("util");

var _ = require("lodash");
var uuid = require("node-uuid");

var shlog = require(global.gBaseDir + "/src/shlog.js");
var session = require(global.gBaseDir + "/src/session.js");  // used by fill session
var ShUser = require(global.gBaseDir + "/src/shuser.js");  // used by fill session

var shutil = exports;

shutil.uuid = function () {
  return uuid.v1();
};

shutil.channel = function (name, id) {
  return "notify." + name + "." + id;
};

shutil.sendWs = function (ws, error, data) {
  var msg = JSON.stringify(data);
  shlog.send(error, "live - (%s) %s", ws.uid, msg);
  ws.send(msg);
};

shutil.event = function (event, data) {
  if (_.isUndefined(data)) {
    data = null;
  }

  var resp = {};
  resp.event = event;
  resp.ts = new Date().getTime();
  resp.data = data;

  return resp;
};

shutil.error = function (code, message, data) {
  var res = this.event("event.error", data);
  res.code = code;
  res.message = message;
  return res;
};

shutil.fillSession = function (req, res, cb) {
  if (_.isUndefined(req.params.cmd)) {
    cb(1, shutil.error("no_cmd", "missing command data"));
    return;
  }
  var cmd = req.params.cmd;
  if (cmd === "reg.login" || cmd === "reg.create" || cmd === "reg.check" || cmd === "reg.anonymous") {
    cb(0);
    return;
  }

  if (_.isUndefined(req.params.session)) {
    cb(1, shutil.error("no_session", "missing session data"));
    return;
  }
  if (!session.check(req.params.session)) {
    cb(1, shutil.error("bad_session", "bad session data"));
    return;
  }
  req.session = {};
  req.session.uid = req.params.session.split(":")[1];
  shlog.info("loading user: uid = " + req.session.uid);
  var user = new ShUser();
  user.loadOrCreate(req.session.uid, function (error, data) {
    if (error !== 0) {
      cb(1, shutil.error("user_load", "unable to load user", {uid: req.session.uid, error: error, data: data}));
      return;
    }
    shlog.info("user loaded: " + req.session.uid);
    req.session.user = user;
    cb(0);
  });
};

shutil.call = function (req, res, cb) {
  var cmd = req.params.cmd;
  shlog.info("cmd = " + cmd);
  var cmdParts = cmd.split(".");
  if (cmdParts.length < 2) {
    cb(1, shutil.error("module_call", "invalid command", {cmd: cmd}));
    return;
  }
  var moduleName = cmdParts[0];
  var funcName = cmdParts[1];
  var cmdFile = global.gBaseDir + "/functions/" + moduleName + "/" + moduleName + ".js";

  // load module
  // SWD for now clear cache each time - will add server command to reload a module
  var module = null;
  try {
    delete require.cache[require.resolve(cmdFile)];
    module = require(cmdFile);
  } catch (e) {
    cb(1, shutil.error("module_require", "unable to load module", {module: moduleName, info: e.message}));
    return;
  }

  // check function
  if (_.isUndefined(module.functions[funcName])) {
    cb(1, shutil.error("module_function", "function does not exist", {module: moduleName, function: funcName}));
    return;
  }

  // validate params
  this.paramsOk = true;
  _.each(module.functions[funcName].params, function (value, key) {
    if (_.isUndefined(req.params[key])) {
      this.paramsOk = false;
      cb(1, shutil.error("param_required", "missing required parameter", {key: key}));
      return false;
    }
    var ptype = typeof req.params[key];
    if (_.isArray(req.params[key])) {
      ptype = "array";
    }
    if (ptype !== value.dtype) {
      this.paramsOk = false;
      cb(1, shutil.error("param_type", "parameter needs to be a " + value.dtype, {key: key, value: req.params[key], type: ptype}));
      return false;
    }
  }, this);
  if (!this.paramsOk) {
    return;
  }

  // init for modules to use to pass data
  if (_.isUndefined(req.env)) {
    req.env = {};
  }

  // ensure we have pre/post functions
  if (!_.isFunction(module.pre)) {
    shlog.info("no pre - using default");
    module.pre = function (req, res, cb) {
      cb(0);
    };
  }
  if (!_.isFunction(module.post)) {
    shlog.info("no post - using default");
    module.post = function (req, res, cb) {
      cb(0);
    };
  }

  // call the pre, function, post sequence
  module.pre(req, res, function (error, data) {
    if (error !== 0) {
      shlog.info("pre error: ", data);
      cb(error, data);
      return;
    }
    module[funcName](req, res, function (error, data) {
      var retError = error;
      var retData = data;
      if (error !== 0) {
        // bail out, no post as function failed
        shlog.info("func error: ", error, data);
        cb(error, data);
        return;
      }
      module.post(req, res, function (error, data) {
        if (error !== 0) {
          cb(error, data);
        } else {
          // return data from actual function call
          cb(retError, retData);
        }
      });
    });
  });
};