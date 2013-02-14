var _ = require("underscore");

var db = global.db;

var game = exports;

game.desc = "game state and control module"
game.functions = {
	create: {desc: 'create a new game', params: {ownerId:{dtype:'string'}}, security: []},
	start: {desc: 'start a game', params: {gameId:{dtype:'string'}}, security: []},
	end: {desc: 'end a game', params: {message:{dtype:'string'}}, security: []},
	get: {desc: 'get game object', params: {gameId:{dtype:'string'}}, security: []},
	set: {desc: 'set game object', params: {gameId:{dtype:'string'}, game: {dtype: 'object'}}, security: []}
};

game.errors = {
	100: "unable to start game",
	101: "unable to end game",
	102: "unable to get game state",
	103: "unable to set game state"
}

game.create = function(req, res, cb)
{
	var out = new Object();

	/*
	var email = sanitize(req.params.email).trim();
	var password = sanitize(req.params.password).trim();
	try {
		check(email, 102).isEmail();
		check(password, 103).len(6);
	} catch (e) {
		cb(e.message);
		return;
	}
	*/
	db.nextId("game", function(err, res) {
		out.gameId = res;
		var ts = new Date().getTime();
		out.created = ts;
		out.lastModified = ts;
		var gameStr = JSON.stringify(out);
		db.kset('kGame', out.gameId, gameStr, function(err, res) {
			if(err != null) {
				cb(101);
				return;
			}
			cb(0, out);
		});
	});
}

game.start = function(req, res, cb)
{
	var ownerId = req.params.ownerId;	
	var out = new Object();
	out.status = "started";
	cb(0, out);
}

game.get = function(req, res, cb)
{
	db.kget('kGame', req.params.gameId, function(err, res){
		if(res == null) {
			cb(102);
			return;
		}
		cb(0, JSON.parse(res));
	});
}

game.set = function(req, res, cb)
{
	var gameId = req.params.gameId;
	var game = req.params.game;
	
	db.kget('kGame', gameId, function(err, res){
		if(res == null) {
			cb(102);
			return;
		}
		var oldGame = JSON.parse(res);
	  game = _.extend(oldGame, game);
		var gameStr = JSON.stringify(game);
		db.kset('kGame', gameId, gameStr, function(err, res) {
			if(err != null) {
				cb(101);
				return;
			}
			cb(0, game);
		});
	});	
}

game.end = function(req, res, cb)
{
	var ownerId = req.params.ownerId;
	// load game, then set status=over
	var gameStr = '';
	db.kset('kGame', owner, gameStr, function(err, res) {
		if(err != null) {
			cb(101);
			return;
		}
		cb(0, {});
	});
}