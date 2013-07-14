var config = exports;

config.dnsName = "localhost";

config.adminPort = 6100;
config.adminUrl = "http://" + config.dnsName + ":" + config.adminPort;

config.restPort = 6101;
config.restUrl = "http://" + config.dnsName + ":" + config.restPort + "/api";

config.gamesPort = 6102;
config.gamesUrl = "http://" + config.dnsName + ":" + config.gamesPort;

// socket options
config.SOCKET_PORT = 6110;
config.SOCKET_URL = "ws://" + config.dnsName + ":" + config.SOCKET_PORT;
config.HEART_BEAT = 30 * 1000;

// cluster options
config.CLUSTER_URL = "tcp://localhost:5152";
config.NUM_WORKERS = 2;

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
