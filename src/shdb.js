// shdb - module to provide key value db access
var util = require('util');

var gDbScope = "dev:";

shdb = exports;

var redis = require("redis"),
	client = redis.createClient();

// if you'd like to select database 3, instead of 0 (default), call
// client.select(3, function() { /* ... */ });

client.on("error", function (err) {
  console.log("Error " + err);
});

var gKeyTypes = {
	kEmailMap: {tpl: "em:%s"},
	kUser: {tpl: "u:%s"},
	kGame: {tpl: "game:%s"},
	kObject: {tpl: "object:%s:%s"}	
}

shdb.init = function() {
	console.log("db init");
/*
client.set("string key", "string val", redis.print);
client.hset("hash key", "hashtest 1", "some value", redis.print);
client.hset(["hash key", "hashtest 2", "some other value"], redis.print);
client.hkeys("hash key", function (err, replies) {
  console.log(replies.length + " replies:");
  replies.forEach(function (reply, i) {
    console.log("    " + i + ": " + reply);
  });
});
*/
}

shdb.get = function(key, cb) {
	console.log(key, cb);
	client.get(key, cb);
}

function genKey(keyType, params) {
	if(typeof(params)=='object')
	{
		var pa = [gKeyTypes[keyType].tpl].concat(params);
		console.log(pa);
		key = gDbScope + util.format.apply(util.format, pa);
		
	} else {
		key = gDbScope + util.format(gKeyTypes[keyType].tpl, params);
	}
	return key;
}

shdb.kget = function(keyType, params, cb) {
	// SWD check keyType undefined
	
	var key = genKey(keyType, params);
	console.log('kget: '+ gKeyTypes[keyType].tpl + '->' + key);
	client.get(key, function(err, value) {
		cb(err, value);
	});
}

shdb.set = function(key, value, cb) {
	client.set(key, value, function(err, value) {
		if(typeof(cb)=='function')
		{
			cb(err);
		}
	});
}

shdb.kset = function(keyType, params, value, cb) {
	// SWD check keyType undefined

	var key = genKey(keyType, params);
	console.log('kset: '+ gKeyTypes[keyType].tpl + '->' + key);
	client.set(key, value, function(err, value) {
		if(typeof(cb)=='function')
		{
			cb(err);
		}
	});
}

shdb.nextId = function(keyType, cb) {
	var key = gDbScope + 'idgen:' + keyType;
	console.log('shdb.nextId: key = ' + key);
	client.incrby(key, 1, cb);
}

shdb.destroy = function() {
	// gracefull end
  client.quit();	
}
