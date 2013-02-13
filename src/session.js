// session - module to provide session key generation and checking

session = exports;

session.create = function(uid) {
	console.log("session.create");
	
	return uid + ':test-session';
}

session.check = function(key) {
	console.log('session.check' + key);
	
	return true;
}