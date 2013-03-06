var config = exports;

config.dnsName = "localhost";

config.restPort = 5101;
config.restUrl = "http://" + config.dnsName + ":" + config.restPort + "/api";


config.adminPort = 5100;
config.adminUrl = "http://" + config.dnsName + ":" + config.adminPort;

// socket options
config.socketPort = 5102;
config.socketUrl = "ws://" + config.dnsName + ":" + config.socketPort;
config.heartBeat = 300 * 1000;