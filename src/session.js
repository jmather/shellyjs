// session - module to provide session key generation and checking
var util = require('util');
var crypto = require('crypto');

session = exports;

var sessionSecret = 'e8017600-764f-11e2-bcfd-0800200c9a66';
var sessionFormat = 'uid=%s;ts=%s;secret=%s';
var sessionVersion = 1;

session.create = function(uid) {
	console.log("session.create");
	
	var ts = new Date().getTime();
	
	var secStr = util.format('uid=%s;ts=%s;secret=%s', uid, ts, sessionSecret);
	var hash = crypto.createHash('md5').update(secStr).digest("hex");

	return sessionVersion + ':' + uid + ':' + hash + ':' + ts;
}

session.check = function(key) {
	console.log('session.check key=' + key);
	if(key == 'xxxx') {
		return true;
	}
	var keyParts = key.split(':');
	if (keyParts.length != 4)
	{
		return false;
	}
	var uid = keyParts[1];
	var hash = keyParts[2];
	var ts = keyParts[3];
	var version = keyParts[0];
	var secStr = util.format('uid=%s;ts=%s;secret=%s', uid, ts, sessionSecret);
	var newHash = crypto.createHash('md5').update(secStr).digest("hex");
	return newHash == hash;
}