// all constants up front for requires
var path = require("path");
global.gBaseDir = path.dirname(path.dirname(process.mainModule.filename));
var os = require("os");
try {
  global.CONF = require(global.gBaseDir + "/config/" + os.hostname() + ".js");
} catch (e) {
  console.error("error: unable to load config file:", os.hostname() + ".js");
  process.exit(1);
}
global.PACKAGE = require(global.gBaseDir + "/package.json");

var shlog = require(global.gBaseDir + "/src/shlog.js");
shlog.info(global.CONF);

// do first so any of our modules can use
global.db = require(global.gBaseDir + "/src/shdb.js");
var sh = require(global.gBaseDir + "/src/shutil.js");
var session = require(global.gBaseDir + "/src/session.js");

var admin = require(global.gBaseDir + "/src/admin.js");
var games = require(global.gBaseDir + "/src/games.js");
var rest = require(global.gBaseDir + "/src/rest.js");

global.socket = require(global.gBaseDir + "/src/socket.js");
global.socket.start();

