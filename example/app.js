try {
  var shelly = require("shellyjs");
} catch (e) {}
if (!shelly) { // handle direct run from module location
  shelly = require(__dirname + "/../src/shelly.js");
}

shelly.start({
  CONFIGDIR: __dirname + "/config",
  APP_API_DIR: __dirname + "/apis",
  GAMES_API_DIR: __dirname + "/games"
});