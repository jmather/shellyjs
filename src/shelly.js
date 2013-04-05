var path = require("path");
var os = require("os");

global.gBaseDir = path.dirname(__dirname);
try {
  global.CONF = require(global.gBaseDir + "/config/" + os.hostname() + ".js");
} catch (e) {
  console.error("error: unable to load config file:", os.hostname() + ".js");
  process.exit(1);
}
global.PACKAGE = require(global.gBaseDir + "/package.json");

var shlog = require(global.gBaseDir + "/src/shlog.js");
shlog.info("loaded:", new Date());
shlog.info("config:", global.CONF);

global.db = require(global.gBaseDir + "/src/shdb.js");

var shelly = exports;

shelly.start = function () {
  global.db.init(function () {
    shlog.info("started:", new Date());
    var admin = require(global.gBaseDir + "/src/admin.js");
    var rest = require(global.gBaseDir + "/src/rest.js");
    var games = require(global.gBaseDir + "/src/games.js");

    global.socket = require(global.gBaseDir + "/src/socket.js");
    global.socket.start();
  });
};