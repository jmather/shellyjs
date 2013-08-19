var shelly = require(__dirname + "/shelly.js");

shelly.start({
  EXT_API_DIR: __dirname + "/apis"
});