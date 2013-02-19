var _ = require("lodash");

var db = global.db;

var game = exports;

game.desc = "game state and control module"
game.functions = {
	create: {desc: 'create a new game', params: {name:{dtype: 'string'},
																							style: {dtype:'string', options:'turn, round, live'},
																							access: {dtype:'string', options:'public, private, invite'},
																							minPlayers:{dtype:'int'},
																							maxPlayers:{dtype:'int'}},
																							security: []},
	start: {desc: 'start a game', params: {gameId:{dtype:'string'}}, security: []},
	join: {desc: 'join an existing game', params: {gameId:{dtype:'string'}}, security: []},
	leave: {desc: 'leave an existing game', params: {gameId:{dtype:'string'}}, security: []},
	kick: {desc: 'kick a user out of game and prevent return', params: {gameId:{dtype:'string'}, kickId:{dtype:'string'}}, security: []},
	turn: {desc: 'calling user taking their turn', params: {gameId:{dtype:'string'}}, security: []},
	end: {desc: 'end a game', params: {gameId: {dtype:'string'}, message:{dtype:'string'}}, security: []},
	get: {desc: 'get game object', params: {gameId:{dtype:'string'}}, security: []},
	set: {desc: 'set game object', params: {gameId:{dtype:'string'}, game: {dtype: 'object'}}, security: []}
};

game.errors = {
	100: "unable to start game",
	101: "unable to end game",
	102: "unable to get game state",
	103: "unable to set game state",
	104: "game has already started",
	105: "not your turn",
	106: "user has already joined",
	107: "unable to parse game state"
}

game.pre = function(req, res, cb)
{
	if(typeof(req.params.gameId) == 'undefined')
	{
		cb(0);
		return;
	}
	
	var gameId = req.params.gameId;
	console.log("game.pre: populating game info for " + gameId);
	db.kget('kGame', gameId, function(err, res) {
		if(res == null) {
			cb(102);
			return;
		}
		// SWD try catch around this
		var game = JSON.parse(res);
		if(game == null) {
			cb(107);
			return;
		}
		console.log("game.pre: setting game for " + gameId);
		req.env.game = game;
		cb(0);
	});
}

game.post = function(req, rs, cb)
{
	console.log("game.post");
	if(typeof(req.env.game) == 'undefined')  // no game to save
	{
		cb(0);
		return;
	}
	console.log("game.post - saving game");
	var game = req.env.game;
	var gameId = req.env.game.gameId;
	
	var gameStr = JSON.stringify(game);	
	db.kset('kGame', gameId, gameStr, function(err, res) {
		if(err != null) {
			cb(103);
			return;
		}
		cb(0);
	});
}

game.create = function(req, res, cb)
{
	var uid = req.session.uid;
	
	var game = new Object();
	
	db.nextId("game", function(err, res) {
		game.gameId = res;
		game.name = req.params.name;
		var ts = new Date().getTime();
		game.created = ts;
		game.lastModified = ts;
		game.status = 'created';
		game.players = {};
		game.players[uid] = {status: 'ready'};
		game.playerOrder = [uid];
		game.whoTurn = uid;
		game.turnsPlayed = 0;
		
		req.env.game = game;
		cb(0, game);	
	});
}

game.start = function(req, res, cb)
{
	var game = req.env.game;
	
	game.status = "playing";
	
	cb(0, game);
}

game.end = function(req, res, cb)
{
	var game = req.env.game;
	
	game.status = "over";
	
	cb(0, game);
}

game.join = function(req, res, cb)
{
	var uid = req.session.uid;
	var game = req.env.game;
	
	if(typeof(game.players[uid]) == 'object') {
		cb(106);  // already in game
		return;
	}
	game.players[uid] = {status: 'ready'};
	game.playerOrder.push(uid);
	
	cb(0, game);
}

game.leave = function(req, res, cb)
{
	var uid = req.session.uid;
	var game = req.env.game;
	
	// SWD checke user
	game.players[uid] = {status: 'left'};
	
	cb(0, game);
}

game.kick = function(req, res, cb)
{
	var kickId = req.params.kickId;
	var game = req.env.game;
	
	// SWD check user
	game.players[kickId] = {status: 'kicked'};
	
	cb(0, game);
}

game.turn = function(req, res, cb)
{
	var uid = req.session.uid;
	var gameId = req.params.gameId;
	
	var game = req.env.game;
	
	var out = new Object();
	
	if(game.whoTurn != uid) {
		cb(105);  // not your turn			
	} else {
		var nextIndex = game.playerOrder.indexOf(uid) + 1;
		if(nextIndex == game.playerOrder.length) {
			nextIndex = 0;
		}
		game.whoTurn = game.playerOrder[nextIndex];
		game.turnsPlayed++;
		cb(0, game);
	}
}

game.get = function(req, res, cb)
{
	cb(0, req.env.game);
}

game.set = function(req, res, cb)
{
	var game = req.env.game;
	var newGame = req.params.game;
	
	game = _.merge(game, newGame);
	
	cb(0, game);
}