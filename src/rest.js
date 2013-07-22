var express = require("express");
var async = require("async");
var _ = require("lodash");

var shlog = require(global.gBaseDir + "/src/shlog.js");
var sh = require(global.gBaseDir + "/src/shutil.js");
var ShLoader = require(global.gBaseDir + "/src/shloader.js");

var rest = express();

rest.use(sh.expressCrossDomain);
rest.use(express.bodyParser());
rest.use(express.cookieParser());

// res.add - adds event or error to output stream
function add(data) {
  if (_.isUndefined(this.msgs)) {
    this.msgs = [];
  }
  this.msgs.push(data);
}

// res.send - sends all events or errors
function sendAll() {
  this.send(this.msgs);
  _.each(this.msgs, function (data) {
    if (data.event === "error") {
      shlog.error("send %j", data);  // log all errors
    }
  });  
  this.msgs = [];
}

function clear() {
  this.msgs = [];
}

rest.use(function (req, res, next) {
  shlog.info("session check");

  req.loader = new ShLoader();
  res.add = add;
  res.sendAll = sendAll;
  res.clear = clear;

  sh.fillSession(req.body.session, req, res, function (error, data) {
    // session.valid now used to control access to functions
    return next();
  });

  return 0;
});

function respond(req, res, next) {
  _.isFunction(next);  // jslint fix - end of line so never gets called;
  shlog.recv("rest - %j", req.body);

  // handle the multi msgs case
  var msgs = null;
  if (_.isArray(req.body.batch)) {
    msgs = req.body.batch;
  } else {
    msgs = [req.body];
  }

  async.eachSeries(msgs, function (item, cb) {
    req.body = item;
    sh.call(req, res, function (err, data) {
      cb(err);
    });
  }, function (err) {
    // wait on dump to avoid any timing issues in fast test runs
    req.loader.dump(function (err) {
      res.sendAll();
    });
  });
}

rest.post("/api", respond);


//********** error handling

rest.use(function (err, req, res, next) {
  // try and save any data modified, if we got that far
  if (_.isObject(req.loader)) {
    req.loader.dump();
  }

  res.status(500);
  shlog.error("rest error %s %j", err, err.stack);
  res.send(sh.error("rest_api", err.message, { message: err.message, stack: err.stack }));
});


//********** server init and handlers

var restServer = rest.listen(global.C.REST_PORT, function () {
  shlog.info("rest server listening: %s", global.C.restPort);
});

restServer.on("error", function (err) {
  shlog.error(err);
});

exports.close = function (cb) {
  if (restServer.address()) {
    restServer.close(cb);
    return;
  }
  cb();
};