var express = require('express');
var _ = require("lodash");

var shlog = require(global.gBaseDir + "/src/shlog.js");
var sh = require(global.gBaseDir + "/src/shutil.js");
var ShLoader = require(global.gBaseDir + "/src/shloader.js");

var rest = express();

rest.use(sh.expressCrossDomain);
rest.use(express.bodyParser());
rest.use(express.cookieParser());

rest.use(function (req, res, next) {
  shlog.info("session check");

  req.loader = new ShLoader();

  sh.fillSession(req, res, function (error, data) {
    if (error !== 0) {
      res.send(data);
      return 0;
    }
    return next();
  });

  return 0;
});

function respond(req, res, next) {
  _.isFunction(next);  // jslint fix - end of line so never gets called;
  shlog.recv("rest - %s", JSON.stringify(req.body));

  sh.call(req, res, function (error, data) {
    if (error) {
      shlog.error(error, data);
    }
    shlog.send(error, "rest - %s", JSON.stringify(data));
    if (_.isObject(data)) {
      data.cb = req.body.cb;
    }
    req.loader.dump();
    res.send(data);
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
  shlog.error("rest error", err, err.stack);
  res.send(sh.error("rest_api", err.message, { message: err.message, stack: err.stack }));
});


//********** server init and handlers

var restServer = rest.listen(global.CONF.restPort, function () {
  shlog.info("rest server listening: %s", global.CONF.restPort);
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