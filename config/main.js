
global.CDEF("DNS_NAME", "localhost");

global.CDEF("ADMIN_PORT", 5100);
global.CDEF("ADMIN_URL", "http://" + global.C.DNS_NAME + ":" + global.C.ADMIN_PORT);

global.CDEF("REST_PORT", 5101);
global.CDEF("REST_URL", "http://" + global.C.DNS_NAME + ":" + global.C.REST_PORT + "/api");

// example game html server
global.CDEF("GAMES_PORT", 5102);
global.CDEF("GAMES_URL", "http://" + global.C.DNS_NAME + ":" + global.C.GAMES_PORT);

// socket options
global.CDEF("SOCKET_PORT", 5110);
global.CDEF("SOCKET_URL", "ws://" + global.C.DNS_NAME + ":" + global.C.SOCKET_PORT);
global.CDEF("HEART_BEAT", 30 * 1000);

// cluster options
global.CDEF("CLUSTER_URL", "tcp://localhost:5151");
global.CDEF("CLUSTER_NUM_SOCKETS", 1);
global.CDEF("CLUSTER_NUM_RESTS", 1);
global.CDEF("CLUSTER_NUM_ADMINS", 1);
global.CDEF("CLUSTER_NUM_GAMES", 1);
global.CDEF("CLUSTER_NUM_MATCHERS", 1);
global.CDEF("CLUSTER_NUM_MAILERS", 1);
global.CDEF({
  "socket": {file: "/src/socket.js", num: global.C.CLUSTER_NUM_SOCKETS},
  "rest": {file: "/src/rest.js", num: global.C.CLUSTER_NUM_SOCKETS},
  "admin": {file: "/src/admin.js", num: global.C.CLUSTER_NUM_SOCKETS},
  "games": {file: "/src/games.js", num: global.C.CLUSTER_NUM_SOCKETS},
  "matcher": {file: "/src/shmatcher.js", num: global.C.CLUSTER_NUM_SOCKETS},
  "mailer": {file: "/src/shmailer.js", num: global.C.CLUSTER_NUM_SOCKETS}
});

// logs
global.CDEF("LOG_STACKTRACE", true);

// registration
global.CDEF("REG_ALLOW_ANONYMOUS", true);

// db
global.CDEF("DB_SCOPE", "dev:");
global.CDEF("DB_WRAPPER", "/src/db/shredis.js");
global.CDEF("DB_OPTIONS", {});
//global.C.db.wrapper = "/src/db/shsqlite.js";
//global.C.db.options = {filename: global.gBaseDir + "/db/sqlite3.db"};

// stats
global.CDEF("STATS_WRAPPER", "/src/stats/shstatsredis.js");
//global.CDEF("STATS_WRAPPER", "/src/stats/shstatsmem.js";

// default admin
global.CDEF("DEFAULT_ADMIN_NAME", "shelly");
global.CDEF("DEFAULT_ADMIN_PASSWORD", "");

// email settings
global.CDEF("EMAIL_NOSEND", true);
global.CDEF("EMAIL_QUEUE", true);
global.CDEF("EMAIL_DEFAULT_FROM", "Game Shelly <shelly@gameshelly.com>");
global.CDEF("EMAIL_TRANSPORT", "SMTP");
global.CDEF("EMAIL_TRANSPORT_SERVICE", {service: "Gmail", auth: {user: "XXXX", pass: "XXXX"}});
//global.CDEF("EMAIL_TRANSPORT", "SES");
//global.CDEF("EMAIL_TRANSPORT_SERVICE", {AWSAccessKeyID: "XXXX", AWSSecretKey: "XXXX"});
//global.CDEF("EMAIL_TRANSPORT", "SMTP");
//global.CDEF("EMAIL_TRANSPORT_SERVICE", {service: "Postmark", auth: {user: "XXXX", pass: "XXXX"}});
