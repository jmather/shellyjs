
global.CDEF("DNS_NAME", "localhost");

global.CDEF("ADMIN_PORT", 5100);
global.CDEF("ADMIN_URL", "http://" + global.C.DNS_NAME + ":" + global.C.ADMIN_PORT);

global.CDEF("REST_PORT", 5101);
global.CDEF("REST_URL", "http://" + global.C.DNS_NAME + ":" + global.C.REST_PORT + "/api");

// example game html server
global.CDEF("GAMES_PORT", 5102);
global.CDEF("GAMES_URL", "http://" + global.C.DNS_NAME + ":" + global.C.GAMES_PORT);

// directory for any external module added to system
global.CDEF("APP_API_DIR", global.C.BASEDIR + "/example/apis");

// directory used by apis/game.js to load specfic game mechanics
global.CDEF("GAMES_API_DIR", global.C.BASEDIR + "/example/games");

// socket options
global.CDEF("SOCKET_PORT", 5110);
global.CDEF("SOCKET_URL", "ws://" + global.C.DNS_NAME + ":" + global.C.SOCKET_PORT);
global.CDEF("HEART_BEAT", 30 * 1000);

// tcp options
global.CDEF("TCP_PORT", 5111);

// cluster options
global.CDEF("CLUSTER_URL", "tcp://localhost:5151");
global.CDEF("CLUSTER_NUM_SOCKET", 2);
global.CDEF("CLUSTER_NUM_TCP", 1);
global.CDEF("CLUSTER_NUM_REST", 1);
global.CDEF("CLUSTER_NUM_ADMIN", 1);
global.CDEF("CLUSTER_NUM_GAMES", 1);
global.CDEF("CLUSTER_NUM_MATCHER", 1);
global.CDEF("CLUSTER_NUM_MAILER", 1);
global.CDEF("CLUSTER", {
  "socket": {src: "/src/socket.js", num: global.C.CLUSTER_NUM_SOCKET, args: ["websocket"]},
  "tcp": {src: "/src/socket.js", num: global.C.CLUSTER_NUM_TCP, args: ["tcp"]},
  "rest": {src: "/src/rest.js", num: global.C.CLUSTER_NUM_REST, args: null},
  "admin": {src: "/src/admin.js", num: global.C.CLUSTER_NUM_ADMIN, args: null},
  "games": {src: "/src/games.js", num: global.C.CLUSTER_NUM_GAMES, args: null},
  "mailer": {src: "/lib/shmailer.js", num: global.C.CLUSTER_NUM_MAILER, args: null}
});
global.CDEF("CLUSTER_AUTO_GAME_MATCHER", true); // auto adds matcher processes per game

// logs: level = system, error, info, debug
global.CDEF("LOG_CONSOLE", true);
global.CDEF("LOG_CONSOLE_OPTS", { level: "info", colorize: true, timestamp: false });
global.CDEF("LOG_FILE", false);
global.CDEF("LOG_FILE_OPTS", { level: "info", json: false, timestamp: true, filename: global.C.BASEDIR + "/logs/shelly.log" });
//global.logHook = function (winston) {
//  console.log("add to winston");
//};

// registration
global.CDEF("LOGIN_PRIVATE_KEY", "login-key-here");
global.CDEF("REG_ALLOW_ANONYMOUS", true);

// db
global.CDEF("DB_SCOPE", "dev:");
global.CDEF("DB_LOCK_RETRIES", 5);
global.CDEF("DB_LOCK_SLEEP", 1000);
//global.CDEF("DB_WRAPPER", global.C.BASEDIR + "/lib/db/shredis.js");
//global.CDEF("DB_OPTIONS", {});
global.CDEF("DB_WRAPPER", global.C.BASEDIR + "/lib/db/shsqlite.js");
global.CDEF("DB_OPTIONS", {filename: global.C.BASEDIR + "/db/sqlite3.db"});

// stats
// if undefined stats share global.db defined above
//global.CDEF("STATS_WRAPPER", global.C.BASEDIR + "/lib/db/shsqlite.js");
//global.CDEF("STATS_OPTIONS", {filename: global.C.BASEDIR + "/db/stats.db"});

// default admin
global.CDEF("DEFAULT_ADMIN_NAME", "shelly");
global.CDEF("DEFAULT_ADMIN_PASSWORD", "shelly");

// session config
global.CDEF("SESSION_PRIVATE_KEY", "session-key-here");
global.CDEF("SESSION_TIMEOUT", 0);                              // seconds for session timeout: 0 = infinity
global.CDEF("FAKE_SESSION_ON", false);                          // TESTING ONLY: allows impersonation of any user
global.CDEF("FAKE_SESSION_HASH", "XXXX");                       // fake hash that is valid for any user


// email settings
global.CDEF("EMAIL_NOSEND", false);
global.CDEF("EMAIL_SENDTO", "");
global.CDEF("EMAIL_QUEUE", true);
global.CDEF("EMAIL_QUEUE_RETRIES", 2);
global.CDEF("EMAIL_DEFAULT_FROM", "Game Shelly <shelly@gameshelly.com>");
global.CDEF("EMAIL_TRANSPORT", "SMTP");
global.CDEF("EMAIL_TRANSPORT_SERVICE", {service: "Gmail", auth: {user: "shelly8804@gmail.com", pass: "foofoofoo"}});
//global.CDEF("EMAIL_TRANSPORT", "SES");
//global.CDEF("EMAIL_TRANSPORT_SERVICE", {AWSAccessKeyID: "XXXX", AWSSecretKey: "XXXX"});
//global.CDEF("EMAIL_TRANSPORT", "SMTP");
//global.CDEF("EMAIL_TRANSPORT_SERVICE", {service: "Postmark", auth: {user: "XXXX", pass: "XXXX"}});

// extended directories
global.CDEF("EXT_API_DIR", "");

// location of server uuid that identifies server in cluster
global.CDEF("SERVER_TAG_FN", global.C.CONFIGDIR + "/server.json");

// matcher options
global.CDEF("MATCHER_INTERVAL", 3000);