var fs = require("fs");
var _ = require("lodash");

var shlog = require(global.C.BASEDIR + "/lib/shlog.js");
var sh = require(global.C.BASEDIR + "/lib/shutil.js");
var stats = require(global.C.BASEDIR + "/lib/shstats.js");
var session = require(global.C.BASEDIR + "/lib/session.js");  // used by fill session
var _w = require(global.C.BASEDIR + "/lib/shcb.js")._w;

var shcall = exports;

shcall.fillSession = function (sess, req, res, cb) {
  req.session = {valid: false, error: sh.error("session-bad", "missing session data")};

  if (_.isUndefined(sess)) {
    return cb(1);
  }
  if (!session.check(sess)) {
    req.session.error = sh.error("session-bad", "bad session data");
    return cb(1);
  }
  var uid = sess.split(":")[1];
  shlog.info("shcall", "loading user: uid = " + uid);
  req.loader.get("kUser", uid, _w(cb, function (error, user) {
    if (error) {
      req.session.error = sh.error("user-load", "unable to load user", {uid: uid, error: error, user: user});
      return cb(1);
    }
    shlog.info("shcall", "user loaded: " + uid);
    req.session.valid = true;
    req.session.uid = uid;
    req.session.user = user;
    cb(0);
  }));
};

shcall.locateApi = function (moduleName, cb) {
  var coreApiFile = global.C.BASEDIR + "/apis/" + moduleName + "/" + moduleName + ".js";
  if (!global.C.APP_API_DIR) {
    return cb(coreApiFile);
  }
  var appApiFile = global.C.APP_API_DIR + "/" + moduleName + "/" + moduleName + ".js";
  fs.exists(appApiFile, function (exists) {
    if (exists) {
      shlog.info("shcall", "using app api file:", appApiFile);
      return cb(appApiFile);
    }
    return cb(coreApiFile);
  });
}

// load module
shcall.createObj = function (moduleName, cb) {
  var obj = null;
  shcall.locateApi(moduleName, function (cmdFile) {
    sh.require(cmdFile, function (err, Module) { // first letter caps as it could be class
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
  });
};

shcall.make = function (req, res, cb) {
  if (_.isUndefined(req.body.cmd)) {
    res.add(sh.error("module_call", "invalid command", {cmd: req.body.cmd}));
    return cb(1);
  }
  stats.incr("cmds", req.body.cmd);

  shlog.info("shcall", "cmd = " + req.body.cmd);
  var cmdParts = req.body.cmd.split(".");
  if (cmdParts.length < 2) {
    res.add(sh.error("module_call", "invalid command", {cmd: req.body.cmd}));
    return cb(1);
  }
  var moduleName = cmdParts[0];
  var funcName = cmdParts[1];

  shcall.createObj(moduleName, function (err, module) {
    if (err) {
      res.add(sh.error("module-load", "unable to load module", module));
      return cb(1);
    }

    // check function def
    if (_.isUndefined(module.functions[funcName])) {
      shcall.locateApi(moduleName, function (apiFile) {
        res.add(sh.error("module-function", "function description does not exist",
          {module: moduleName, function: funcName, file: apiFile}));
        return cb(1);
      });
      return;
    }

    // check session required
    if (!req.session.valid) {
      if (_.isUndefined(module.functions[funcName].noSession) || !module.functions[funcName].noSession) {
        if (_.isUndefined(req.session.error)) {
          req.session.error = sh.error("invalid-session", "no session data");
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
        res.add(sh.error("function-perms", "user does not have permision to call this function", {module: moduleName,
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
        res.add(sh.error("param-required", "missing required parameter", {cmd: req.body.cmd, key: key}));
        return cb(1);
      }
      var ptype = typeof req.body[key];
      if (_.isArray(req.body[key])) {
        ptype = "array";
      }
      if (ptype !== value.dtype) {
        this.paramsOk = false;
        res.add(sh.error("param-type", "parameter needs to be a " + value.dtype, {key: key, value: req.body[key], type: ptype}));
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
      res.add(sh.error("module_function", "function does not exist in module", {module: moduleName, function: funcName}));
      return cb(1);
    }

    // init for modules to use to pass data
    if (_.isUndefined(req.env)) {
      req.env = {};
    }

    // ensure we have pre/post functions
    if (!_.isFunction(obj.pre)) {
      shlog.info("shcall", "no pre - using default");
      obj.pre = function (req, res, cb) {
        cb(0);
      };
    }
    if (!_.isFunction(obj.post)) {
      shlog.info("shcall", "no post - using default");
      obj.post = function (req, res, cb) {
        cb(0);
      };
    }

    // call the pre, function, post sequence
    obj.pre(req, res, _w(cb, function (error, data) {
      if (error) {
        shlog.info("shcall", "pre error: ", error);
        return cb(error, data);
      }
      obj[funcName](req, res, _w(cb, function (error, data) {
        var retError = error;
        var retData = data;
        if (error) {
          // bail out, no post as function failed
          shlog.info("shcall", "func error: ", error);
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