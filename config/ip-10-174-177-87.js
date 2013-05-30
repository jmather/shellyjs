var config = exports;

config.dnsName = "dev2.skool51.com";

config.adminPort = 5100;
config.adminUrl = "http://" + config.dnsName + ":" + config.adminPort;

config.restPort = 5101;
config.restUrl = "http://" + config.dnsName + ":" + config.restPort + "/api";

config.gamesPort = 5102;
config.gamesUrl = "http://" + config.dnsName + ":" + config.gamesPort;

config.socketPort = 5110;
config.socketUrl = "ws://" + config.dnsName + ":" + config.socketPort;

// db
config.db = {};
config.db.wrapper = "/src/db/shredis.js";
config.db.options = {};