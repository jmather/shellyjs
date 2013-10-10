global.CDEF("MODULE_NO_CACHE", true);

global.CDEF("CLUSTER_NUM_SOCKET", 1);

global.CDEF("EMAIL_NOSEND", false);
global.CDEF("EMAIL_SENDTO", "scott@lgdales.com");

global.CDEF("LOG_MODULES", {"shelly": 1, "locate": 1, "call": 1, "send": 0, "notify": 0, "shlock": 1, "SWD": 1});

global.CDEF("DB_OPTIONS", {filename: global.C.BASE_DIR + "/db/sqlite3.db", busyTimeout: 10000});

//global.CDEF("DB_WRAPPER", global.C.BASE_DIR + "/lib/db/shredis.js");
//global.CDEF("DB_OPTIONS", {port: 6379, host: "127.0.0.1"});
