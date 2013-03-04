var config = exports;

config.dnsName = "dev2.skool51.com";

config.restPort = 5101;
config.restUrl = "http://" + config.dnsName + ":" + config.restPort + "/api";

config.adminPort = 5100;
config.adminUrl = "http://" + config.dnsName + ":" + config.adminPort;

// socket options
config.socketPort = 5102;
config.socketUrl = "ws://" + config.dnsName + ":" + config.socketPort;
config.heartBeat = 30 * 1000;