var events = require('events');

var shutil = require(global.gBaseDir + '/src/shutil.js');

var game = require(global.gBaseDir + '/functions/game/game.js');

var gqueue = exports;

gqueue.desc = "game state and control module";
gqueue.functions = {
	add: {desc: 'add a game to the queue', params: {gameId:{dtype:'string'}, data:{dtype:'object'}}, security: []},
	remove: {desc: 'remove a game from the list', params: {gameId:{dtype:'string'}}, security: []},
	nextAvailable: {desc: 'get the next available game', params: {}, security: []},
	list: {desc: 'return a list of available games', params: {limit:{dtype:'int'}}, security: []}
};

gqueue.errors = {
	100: "no games available",
	101: "game already in available list"
}

// SWD: just init a global game queue for now
if (typeof(global.gq) == 'undefined') {
	global.gq = [];
}

gqueue.add = function(req, res, cb) {
	var gameId = req.params.gameId;
	var data = req.params.data;
	
	// SWD: this will be too slow, change to hash presence list for data, and check/add/remove from that also
	for (var i=0; i<gq.length; i++) {
		if (gq[i].gameId == gameId) {
			cb(101, shutil.error({info: 'game already in queue'}));
			return;
		}
	}
	
	var ts = new Date().getTime();
	var gameInfo = {gameId: gameId, data: data, ts: ts};
	gq.push(gameInfo);
	cb(0, gameInfo);
}

gqueue.remove = function(req, res, cb) {
	var gameId = req.params.gameId;
	
	var gameInfo = null;
	for (var i=0; i<gq.length; i++) {
		if (gq[i].gameId == gameId) {
			gameInfo = gq.splice(i, 1);
		}
	}
	
	cb(0, gameInfo);
}

gqueue.nextAvailable = function(req, res, cb) {
	if(gq.length == 0) {
		cb(100, shutil.error({info: 'no games available'}));
		return;
	}
	gameInfo = gq.shift();
	
	req.params.gameId = gameInfo.gameId;
	shutil.call("game.join", req, res, function(error, data) {
		if(error != 0) {
			// put the game back in the available queue
			gq.unshift(gameInfo);
		}
		cb(error, data);
	});
	
//	game.pre(req, res, function(error, data) {
//		game.join(req, res, function(error, data) {
//			var retError = error;
//			var retData = data;
//			game.post(req, res, function(error, data) {
//				cb(retError, retData);
//			});
//		});
//	});
}

gqueue.list = function(req, res, cb) {
	var limit = req.params.limit;
	if (limit > 0) {
		cb(0, gq.slice(0, limit));
		return;
	}
	cb(0, gq);
}
