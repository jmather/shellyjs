var config = exports;

config.dnsName = "localhost";

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
//config.db.wrapper = "/src/db/shsqlite.js";
//config.db.options = {filename: global.gBaseDir + "/db/sqlite3.db"};
config.db.wrapper = "/src/db/shredis.js";
config.db.options = {};

// stats
config.STATS = {};
//config.STATS.WRAPPER = "/src/stats/shstatsmem.js";
config.STATS.WRAPPER = "/src/stats/shstatsredis.js";

// default admin
config.DEFAULT_ADMIN_NAME = "shelly";
config.DEFAULT_ADMIN_PASSWORD = "";