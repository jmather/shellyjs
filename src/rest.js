var express = require('express');
var _ = require("lodash");

var shlog = require(global.gBaseDir + "/src/shlog.js");
var sh = require(global.gBaseDir + "/src/shutil.js");

var rest = express();

var allowCrossDomain = function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');

  // intercept OPTIONS method
  if ('OPTIONS' === req.method) {
    res.send(200);
    return;
  }

  next();
};
rest.use(allowCrossDomain);
rest.use(express.bodyParser());
rest.use(express.cookieParser());

rest.use(function (req, res, next) {
  shlog.info("session check");

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
    if (data !== null && !_.isUndefined(data)) {
      data.cb = req.body.cb;
    }
    res.send(data);
  });
}

rest.post("/api", respond);

rest.listen(global.CONF.restPort, function () {
  shlog.info("rest server listening: %s", global.CONF.restPort);
});