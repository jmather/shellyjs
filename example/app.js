var shelly = require(__dirname + "/../lib/shelly.js");

shelly.start({
  APP_API_DIR: __dirname + "/apis",
  GAMES_API_DIR: __dirname + "/games"
});