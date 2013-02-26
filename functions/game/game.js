var _ = require("lodash");

var shutil = require(global.gBaseDir + '/src/shutil.js');

var db = global.db;

var gGameDir = global.gBaseDir + '/games';

var game = exports;

game.desc = "game state and control module"
game.functions = {
	create: {desc: 'create a new game', params: {name:{dtype: 'string'}}, security: []},
	start: {desc: 'start a game', params: {gameId:{dtype:'string'}}, security: []},
	join: {desc: 'join an existing game', params: {gameId:{dtype:'string'}}, security: []},
	leave: {desc: 'leave an existing game', params: {gameId:{dtype:'string'}}, security: []},
	kick: {desc: 'kick a user out of game and prevent return', params: {gameId:{dtype:'string'}, kickId:{dtype:'string'}}, security: []},
	turn: {desc: 'calling user taking their turn', params: {gameId:{dtype:'string'}}, security: []},
	end: {desc: 'end a game', params: {gameId: {dtype:'string'}, message:{dtype:'string'}}, security: []},
	get: {desc: 'get game object', params: {gameId:{dtype:'string'}}, security: []},
	set: {desc: 'set game object', params: {gameId:{dtype:'string'}, game: {dtype: 'object'}}, security: []},
	reset: {desc: 'reset game for another round', params: {gameId:{dtype:'string'}}, security: []},
	
	list: {desc: 'list all loaded games', params: {}, security: []},
	call: {desc: 'call a game specific function', params: {gameId:{dtype:'string'}, func: {dtype:'string'}, args: {dtype: 'object'}}, security: []},
};

game.errors = {
	100: "unable to start game",
	101: "unable to end game",
	102: "unable to get game state foo",
	103: "unable to set game state",
	104: "game has already started",
	105: "not your turn",
	106: "user has already joined", // not used anymore
	107: "unable to parse game state",
	108: "unable to load game",
	109: "unable to load custom function"
}

function loadGame(name)
{	
	var gameFile = gGameDir + '/' + name + '/' + name + '.js';
	// SWD for now clear cache each time - will add server command to reload a module
	// SWD should check for all required functions
	delete require.cache[require.resolve(gameFile)];
	var module = require(gameFile);
	return module;
}

game.pre = function(req, res, cb)
{
	if(req.params.cmd == 'game.create')
	{
		var name = req.params.name;
		try {
			console.log("game.pre: game.create = "  + name);
			req.env.gameModule = loadGame(name);
			cb(0);
			return;
		} catch (e) {
			cb(108, shutil.error({cmd:req.params.cmd, func:'game.pre', info:'loadGame:'+name, message: e.message}));
			return;
		}
	}
	
	var gameId = req.params.gameId;
	console.log("game.pre: populating game info for " + gameId);
	db.kget('kGame', gameId, function(err, res) {
		if(res == null) {
			cb(102, shutil.error({cmd:req.params.cmd, func:'game.pre', info:'unable to load game loadGame', gameId: gameId}));
			return;
		}
		// SWD try catch around this
		var game = JSON.parse(res);
		if(game == null) {
			cb(107, shutil.error({cmd:req.params.cmd, func:'game.pre', info:'parse game data', message: e.message}));
			return;
		}

		try {		
			console.log("game.pre: setting game:"  + game.name + " = " + gameId);
			req.env.gameModule = loadGame(game.name);
		} catch (e) {
			cb(108, shutil.error({cmd:req.params.cmd, func:'game.pre', info:'loadGame:'+game.name, message: e.message}));
			return;
		}

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
			cb(103, shutil.error({info: 'unable to save game'}));
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
		game.ownerId = uid;
		game.created = ts;
		game.lastModified = ts;
		game.status = 'created';
		game.players = {};
		game.players[uid] = {status: 'ready'};
		game.playerOrder = [uid];
		game.whoTurn = uid;
		game.rounds = 0;
		game.turnsPlayed = 0;
		
		req.env.game = game;
		
		req.session.user.addGame(game);
	
		// SWD make sure init is there
		req.env.gameModule.init(req, function(error, data) {
			cb(error, data);
		});
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
	var user = req.session.user;
	
	user.addGame(game);
	
	if(typeof(game.players[uid]) == 'object') {
		game.players[uid].status = 'ready';
	} else {
		game.players[uid] = {status: 'ready'};
		game.playerOrder.push(uid);
	}
	cb(0, shutil.event('event.game.info', game));
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
	var self = this;
	var uid = req.session.uid;
	var gameId = req.params.gameId;	
	var game = req.env.game;
	
	if(game.status == 'over') {
		cb(0, shutil.event("event.game.over", game));
		return;
	}
	
	var out = new Object();
	
	if(game.whoTurn != uid) {
		cb(105, shutil.error({cmd: req.params.cmd, message:'not your turn', whoTurn: game.whoTurn}));
	} else {
		var nextIndex = game.playerOrder.indexOf(uid) + 1;
		if(nextIndex == game.playerOrder.length) {
			nextIndex = 0;
		}
		game.whoTurn = game.playerOrder[nextIndex];
		game.turnsPlayed++;
		
		//SWD make sure turn function is there
		req.env.gameModule.turn(req, function(error, data) {
			if(error == 0)
			{
				if(typeof(data)=='undefined') {
					data = shutil.event("event.game.info", game)
				}
				global.live.notify(gameId, data);  // notify others
			}
			cb(error, data);
		});
	}
}

game.get = function(req, res, cb)
{
	// SWD - game is bad name for this all over
	var game = req.env.game;
	
	var data = shutil.event("event.game.info", game);
	console.log(data);
	cb(0, data);
}

game.set = function(req, res, cb)
{
	var game = req.env.game;
	var newGame = req.params.game;
	
	game = _.merge(game, newGame);
	
	var data = shutil.event("event.game.info", game);
	cb(0, data);
}

game.reset = function(req, res, cb) {
	var self = this;
	
	var game = req.env.game;
	game.rounds++;
	game.turns = 0;
	game.whoTurn = game.ownerId;
	game.status = "playing";
	game.winner = null;
	
	req.env.gameModule.init(req, function(error, data) {
		if (error == 0) {
			global.live.notify(game.gameId, data);
			if(typeof(data) == 'undefined') {
				data = shutil.event("event.game.reset", game)
			}
		}
		cb(error, data);
	});
}

game.list = function(req, res, cb)
{
	console.log("game.list");
	
	cb(0);
}

game.call = function(req, res, cb)
{
	console.log("game.call - req.params.func");
	var module = req.env.gameModule;
	
	if(typeof(module[req.params.func]) == 'undefined') {
		cb(109, shutil.error({info: 'function does not exist', func: req.params.func}));
		return;
	}
	
	req.env.gameModule[req.params.func](req, cb);
}