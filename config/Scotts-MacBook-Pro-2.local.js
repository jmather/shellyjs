var config = exports;

config.dnsName = "localhost";

config.restPort = 5101;
config.restUrl = "http://" + config.dnsName + ":" + config.restPort + "/api";

config.socketPort = 5102;
config.socketUrl = "ws://" + config.dnsName + ":" + config.socketPort;

config.adminPort = 5100;
config.adminUrl = "http://" + config.dnsName + ":" + config.adminPort;
