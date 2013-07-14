
global.CDEF("dnsName", "localhost");

global.CDEF("adminPort", 5100);
global.CDEF("adminUrl", "http://" + global.C.dnsName + ":" + global.C.adminPort);

global.CDEF("restPort", 5101);
global.CDEF("restUrl", "http://" + global.C.dnsName + ":" + global.C.restPort + "/api");

// example game html server
global.CDEF("gamesPort", 5102);
global.CDEF("gamesUrl", "http://" + global.C.dnsName + ":" + global.C.gamesPort);

// socket options
global.CDEF("socketPort", 5110);
global.CDEF("socketUrl", "ws://" + global.C.dnsName + ":" + global.C.socketPort);
global.CDEF("heartBeat", 30 * 1000);

// cluster options
global.CDEF("clusterUrl", "tcp://localhost:5151");
global.CDEF("NUM_WORKERS", 2);

// db
global.CDEF("DB_WRAPPER", "/src/db/shredis.js");
global.CDEF("DB_OPTIONS", {});
//global.C.db.wrapper = "/src/db/shsqlite.js";
//global.C.db.options = {filename: global.gBaseDir + "/db/sqlite3.db"};

// stats
global.CDEF("STATS_WRAPPER", "/src/stats/shstatsredis.js");
//global.CDEF("STATS_WRAPPER", "/src/stats/shstatsmem.js";

// default admin
global.CDEF("DEFAULT_ADMIN_NAME", "shelly");
global.CDEF("DEFALUT_ADMIN_PASSWORD", "");