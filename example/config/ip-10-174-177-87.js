
// dev hostname
global.CDEF("DNS_NAME", "dev2.skool51.com");

// db
global.CDEF("DB_WRAPPER", global.C.BASEDIR + "/lib/db/shredis.js");
global.CDEF("DB_OPTIONS", {port: 6379, host: "127.0.0.1"});