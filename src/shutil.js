var path = require("path");
var util = require("util");
var domain = require("domain");

var _ = require("lodash");
var async = require("async");
var uuid = require("node-uuid");

var shlog = require(global.gBaseDir + "/src/shlog.js");
var session = require(global.gBaseDir + "/src/session.js");  // used by fill session

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
  return res;
};

shutil.fillSession = function (sess, req, res, cb) {
  req.session = {valid: false,
    error: shutil.error("no_session", "missing session data")};

  if (_.isUndefined(sess)) {
    return cb(1);
  }
  if (!session.check(sess)) {
    req.session.error = shutil.error("bad_session", "bad session data");
    return cb(1);
  }
  var uid = sess.split(":")[1];
  shlog.info("loading user: uid = " + uid);
  req.loader.get("kUser", uid, function (error, user) {
    if (error) {
      req.session.error = shutil.error("user_load", "unable to load user", {uid: uid, error: error, user: user});
      return cb(1);
    }
    shlog.info("user loaded: " + uid);
    req.session.valid = true;
    req.session.uid = uid;
    req.session.user = user;
    cb(0);
  });
};

shutil.call = function (req, res, cb) {
  if (_.isUndefined(req.body.cmd)) {
    res.add(shutil.error("module_call", "invalid command", {cmd: req.body.cmd}));
    return cb(1);
  }

  shlog.info("cmd = " + req.body.cmd);
  var cmdParts = req.body.cmd.split(".");
  if (cmdParts.length < 2) {
    res.add(shutil.error("module_call", "invalid command", {cmd: req.body.cmd}));
    return cb(1);
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
    res.add(shutil.error("module_require", "unable to load module", {module: moduleName, message: e.message, stack: e.stack}));
    return cb(1);
  }

  // check function
  if (_.isUndefined(module[funcName])) {
    res.add(shutil.error("module_function", "function does not exist in module", {module: moduleName, function: funcName}));
    return cb(1);
  }

  // check function def
  if (_.isUndefined(module.functions[funcName])) {
    res.add(shutil.error("module_function", "function description does not exist", {module: moduleName, function: funcName}));
    return cb(1);
  }

  // check session required
  if (!req.session.valid) {
    if (_.isUndefined(module.functions[funcName].noSession) || !module.functions[funcName].noSession) {
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
      res.add(shutil.error("function_perms", "user does not have permision to call this function", {module: moduleName,
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
      res.add(shutil.error("param_required", "missing required parameter", {cmd: req.body.cmd, key: key}));
      return cb(1);
    }
    var ptype = typeof req.body[key];
    if (_.isArray(req.body[key])) {
      ptype = "array";
    }
    if (ptype !== value.dtype) {
      this.paramsOk = false;
      res.add(shutil.error("param_type", "parameter needs to be a " + value.dtype, {key: key, value: req.body[key], type: ptype}));
      return cb(1);
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
    if (error) {
      shlog.info("pre error: ", error);
      return cb(error, data);
    }
    module[funcName](req, res, function (error, data) {
      var retError = error;
      var retData = data;
      if (error) {
        // bail out, no post as function failed
        shlog.info("func error: ", error);
        return cb(error, data);
      }
      module.post(req, res, function (error, data) {
        if (error) {
          return cb(error, data);
        }
        // return data from actual function call
        cb(retError, retData);
      });
    });
  });
};

// takes array of uids
shutil.fillProfiles = function (loader, userIds, cb) {
  var profiles = {};
  async.each(userIds, function (userId, lcb) {
    loader.exists("kUser", userId, function (error, user) {
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
    });
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
    loader.get("kUser", userId, function (error, user) {
      if (error) {
        lcb(user);
        return;
      }
      profiles[userId].name = user.get("name");
      if (profiles[userId].name.length === 0) {
        profiles[userId].name = "anon" + userId.substr(0, 4);
      }
      lcb();
    });
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

shutil.expressError = function (req, res, next) {
  next();
// SWD: this does not work as the stack keeps growing
// the run does not work either, the stack has a race condition where
// if the second call finishes before the first it pops the wrong domain
/*
  var dm = domain.create();
  dm.on("error", function(err) {
    next(err);
    dm.dispose();
  });
  dm.enter();
  next();
*/
//  dm.run(next); // does not work
};
