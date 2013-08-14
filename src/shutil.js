var path = require("path");
var util = require("util");
var domain = require("domain");

var _ = require("lodash");
var async = require("async");
var uuid = require("node-uuid");
var stackTrace = require("stack-trace");

var shlog = require(global.gBaseDir + "/src/shlog.js");
var stats = require(global.gBaseDir + "/src/shstats.js");
var session = require(global.gBaseDir + "/src/session.js");  // used by fill session
var _w = require(global.gBaseDir + "/src/shcb.js")._w;

var shutil = exports;

shutil.uuid = function () {
  return uuid.v1();
};

shutil.modString = function (str, m) {
  var sum = 0;
  _.each(str, function (c) {
    sum += c.charCodeAt(0);
  });
  return sum % m;
};

shutil.require = function (cmdFile, cb) {
  try {
    delete require.cache[require.resolve(cmdFile)];
    var module = require(cmdFile);
    return cb(0, module);
  } catch (e) {
    return cb(1, shutil.intMsg("module-require", {file: cmdFile, message: e.toString()}));
  }
};

shutil.sendWs = function (ws, error, data) {
  var msg = JSON.stringify(data);
  shlog.send(error, "live uid:%s len:%d data:%s", ws.uid, msg.length, msg);
  ws.send(msg);
};

shutil.event = function (event, data) {
  if (_.isUndefined(data) || data === null) {
    data = {};
  }

  var resp = {};
  resp.event = event;
  resp.ts = new Date().getTime();
  resp.data = data;

  return resp;
};

shutil.error = function (code, message, data) {
  var res = this.event("error", data);
  res.code = code;
  res.message = message;

  var trace = stackTrace.get();
  var callerFn = trace[1].getFileName();
  res.file = path.basename(callerFn);
  res.line = trace[1].getLineNumber();

  return res;
};

shutil.intMsg = function (code, data) {
  var res = {};
  res.code = code;
  res.data = data;

  var trace = stackTrace.get();
  var fn = trace[1].getFileName();
  res.file = path.basename(fn);
  res.line = trace[1].getLineNumber();

  return res;
};

shutil.fillSession = function (sess, req, res, cb) {
  req.session = {valid: false,
    error: shutil.error("session-bad", "missing session data")};

  if (_.isUndefined(sess)) {
    return cb(1);
  }
  if (!session.check(sess)) {
    req.session.error = shutil.error("bad-session", "bad session data");
    return cb(1);
  }
  var uid = sess.split(":")[1];
  shlog.info("loading user: uid = " + uid);
  req.loader.get("kUser", uid, _w(cb, function (error, user) {
    if (error) {
      req.session.error = shutil.error("user-load", "unable to load user", {uid: uid, error: error, user: user});
      return cb(1);
    }
    shlog.info("user loaded: " + uid);
    req.session.valid = true;
    req.session.uid = uid;
    req.session.user = user;
    cb(0);
  }));
};

// load module
shutil.createObj = function (moduleName, cb) {
  var Module = null;
  var obj = null;
  var cmdFile = global.gBaseDir + "/functions/" + moduleName + "/" + moduleName + ".js";
  shutil.require(cmdFile, function (err, Module) { // first letter caps as it could be class
    if (err) {
      return cb(err, Module);
    }
    if (_.isFunction(Module)) { // handle objects instead of module functions
      obj = new Module();
    } else {
      obj = Module;
    }
    cb(0, obj);
  });
};

shutil.call = function (req, res, cb) {
  if (_.isUndefined(req.body.cmd)) {
    res.add(shutil.error("module_call", "invalid command", {cmd: req.body.cmd}));
    return cb(1);
  }
  stats.incr("cmds", req.body.cmd);

  shlog.info("cmd = " + req.body.cmd);
  var cmdParts = req.body.cmd.split(".");
  if (cmdParts.length < 2) {
    res.add(shutil.error("module_call", "invalid command", {cmd: req.body.cmd}));
    return cb(1);
  }
  var moduleName = cmdParts[0];
  var funcName = cmdParts[1];

  shutil.createObj(moduleName, function (err, module) {
    if (err) {
      res.add(shutil.error("module-load", "unable to load module", module));
      return cb(1);
    }

    // check function def
    if (_.isUndefined(module.functions[funcName])) {
      res.add(shutil.error("module-function", "function description does not exist", {module: moduleName, function: funcName}));
      return cb(1);
    }

    // check session required
    if (!req.session.valid) {
      if (_.isUndefined(module.functions[funcName].noSession) || !module.functions[funcName].noSession) {
        if (_.isUndefined(req.session.error)) {
          req.session.error = shutil.error("invalid-session", "no session data");
        }
        res.add(req.session.error);
        return cb(1);
      }
    }

    // check function perms
    if (module.functions[funcName].security.length > 0) {
      var hasPerms = _.find(module.functions[funcName].security, function (value) {
        return req.session.user.hasRole(value);
      });
      if (!hasPerms) {
        res.add(shutil.error("function-perms", "user does not have permision to call this function", {module: moduleName,
          function: funcName, security: module.functions[funcName].security}));
        return cb(1);
      }
    }

    // validate params
    this.paramsOk = true;
    _.each(module.functions[funcName].params, function (value, key) {
      if (!_.isUndefined(value.optional) || value.optional === true) {
        return;
      }
      if (_.isUndefined(req.body[key])) {
        this.paramsOk = false;
        res.add(shutil.error("param-required", "missing required parameter", {cmd: req.body.cmd, key: key}));
        return cb(1);
      }
      var ptype = typeof req.body[key];
      if (_.isArray(req.body[key])) {
        ptype = "array";
      }
      if (ptype !== value.dtype) {
        this.paramsOk = false;
        res.add(shutil.error("param-type", "parameter needs to be a " + value.dtype, {key: key, value: req.body[key], type: ptype}));
        return cb(1);
      }
    }, this);
    if (!this.paramsOk) {
      return;
    }

    // handle object modules
    var obj = module;

    // check function
    if (_.isUndefined(obj[funcName])) {
      res.add(shutil.error("module_function", "function does not exist in module", {module: moduleName, function: funcName}));
      return cb(1);
    }

    // init for modules to use to pass data
    if (_.isUndefined(req.env)) {
      req.env = {};
    }

    // ensure we have pre/post functions
    if (!_.isFunction(obj.pre)) {
      shlog.info("no pre - using default");
      obj.pre = function (req, res, cb) {
        cb(0);
      };
    }
    if (!_.isFunction(obj.post)) {
      shlog.info("no post - using default");
      obj.post = function (req, res, cb) {
        cb(0);
      };
    }

    // call the pre, function, post sequence
    obj.pre(req, res, _w(cb, function (error, data) {
      if (error) {
        shlog.info("pre error: ", error);
        return cb(error, data);
      }
      obj[funcName](req, res, _w(cb, function (error, data) {
        var retError = error;
        var retData = data;
        if (error) {
          // bail out, no post as function failed
          shlog.info("func error: ", error);
          return cb(error, data);
        }
        obj.post(req, res, _w(cb, function (error, data) {
          if (error) {
            return cb(error, data);
          }
          // return data from actual function call
          cb(retError, retData);
        }));
      }));
    }));
  });
};

// takes array of uids
shutil.fillProfiles = function (loader, userIds, cb) {
  var profiles = {};
  async.each(userIds, function (userId, lcb) {
    loader.exists("kUser", userId, _w(lcb, function (error, user) {
      if (error) {
        lcb(); // just skip and keep going
        return;
      }
      profiles[userId] = {};
      profiles[userId].name = user.get("name");
      if (profiles[userId].name.length === 0) {
        profiles[userId].name = "anon" + userId.substr(0, 4);
      }
      lcb();
    }));
  }, function (error) {
    if (error) {
      cb(1, error);
      return;
    }
    cb(0, profiles);
  });
};

// takes object of objects with uids of keys
shutil.extendProfiles = function (loader, profiles, cb) {
  var userIds = Object.keys(profiles);
  async.each(userIds, function (userId, lcb) {
    loader.get("kUser", userId, _w(lcb, function (error, user) {
      if (error) {
        lcb(user);
        return;
      }
      profiles[userId].name = user.get("name");
      if (profiles[userId].name.length === 0) {
        profiles[userId].name = "anon" + userId.substr(0, 4);
      }
      lcb();
    }));
  }, function (error) {
    if (error) {
      cb(1, error);
      return;
    }
    cb(0, profiles);
  });
};

shutil.expressCrossDomain = function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, Content-Length, X-Requested-With");
  if ("OPTIONS" === req.method) {
    res.send(200);
    return;
  }
  next();
};