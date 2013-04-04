var config = exports;

config.dnsName = "dev2.skool51.com";

config.adminPort = 5100;
config.adminUrl = "http://" + config.dnsName + ":" + config.adminPort;

config.restPort = 5101;
config.restUrl = "http://" + config.dnsName + ":" + config.restPort + "/api";

config.gamesPort = 5102;
config.gamesUrl = "http://" + config.dnsName + ":" + config.gamesPort;

// socket options
config.socketPort = 5110;
config.socketUrl = "ws://" + config.dnsName + ":" + config.socketPort;
config.heartBeat = 30 * 1000;

// db
config.db = {};
config.db.name = "redis";
config.db.settings = {json: false, cache: 0};
//config.db.name = "sqlite";
//config.db.settings = {json: false, cache: 0, filename: global.gBaseDir + "/db/sqlite3.db"};