var config = exports;

config.dnsName = "dev2.skool51.com";
// must reset these and dnsName has changed
config.adminUrl = "http://" + config.dnsName + ":" + config.adminPort;
config.restUrl = "http://" + config.dnsName + ":" + config.restPort + "/api";
config.gamesUrl = "http://" + config.dnsName + ":" + config.gamesPort;
config.socketUrl = "ws://" + config.dnsName + ":" + config.socketPort;

// db
config.db = {};
config.db.wrapper = "/src/db/shredis.js";
config.db.options = {};