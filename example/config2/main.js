
global.CDEF("ADMIN_PORT", 6100);
global.CDEF("REST_PORT", 6101);
global.CDEF("GAMES_PORT", 6102);
global.CDEF("SOCKET_PORT", 6110);
global.CDEF("TCP_PORT", 6111);

// cluster options
global.CDEF("CLUSTER_URL", "tcp://localhost:6151");
// don't run a queue processor on this server
global.CDEF("CLUSTER_NUM_MAILERS", 0);

// send email direct
//global.CDEF("EMAIL_QUEUE", false);


// pick up all the other default configs
require(global.C.BASEDIR + "/config/main.js");