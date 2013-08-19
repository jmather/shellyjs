var shelly = require(__dirname + "/shelly.js");

shelly.start({
  EXT_API_DIR: "/foo/",
  CLUSTER_NUM_SOCKET: 1
});