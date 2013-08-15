var _ = require("lodash");
var async = require("async");

var shlog = require(global.gBaseDir + "/src/shlog.js");

global.socket = null;

var shelly = exports;

var admin = null;
var rest = null;
var games = null;

shelly.start = function () {
  shlog.info("starting web and socket");

  admin = require(global.gBaseDir + "/src/admin.js");
  rest = require(global.gBaseDir + "/src/rest.js");
  games = require(global.gBaseDir + "/src/games.js");

  global.socket = require(global.gBaseDir + "/src/socket.js");
  global.socket.start();
};

shelly.shutdown = function (cb) {
  async.series([
    function (cb) {
      if (global.socket) {
        shlog.info("shutting down socket");
        global.socket.close(function () { global.socket = null; cb(0); });
      } else { cb(0); }
    },
    function (cb) {
      // do not use callbacks for these servers as the keep-alives make the delay long
      // not sure why http server is jut not force closing these
      if (rest) {
        shlog.info("shutting down rest");
        rest.close();
        rest = null;
      }
      if (admin) {
        shlog.info("shutting down admin");
        admin.close();
        admin = null;
      }
      if (games) {
        shlog.info("shutting down games");
        games.close();
        games = null;
      }
      cb(0);
    }
  ],
    function (err, results) {
      shlog.info("done.");
      cb(0);
    });
};