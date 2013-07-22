
global.CDEF("ADMIN_PORT", 6100);
global.CDEF("REST_PORT", 6101);
global.CDEF("GAMES_PORT", 6102);
global.CDEF("SOCKET_PORT", 6110);

// cluster options
global.CDEF("CLUSTER_URL", "tcp://localhost:6151");
global.CDEF("NUM_WORKERS", 1);

// don't run a queue processor - no keys in this config
global.CDEF("EMAIL_QUEUE", false);


// pick up all the other default configs
require(__dirname + "/../config/main.js");