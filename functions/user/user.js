var _ = require('lodash');

var shutil = require(global.gBaseDir + '/src/shutil.js');

var db = global.db;

var user = exports;

user.desc = "utility functions for shelly modules"
user.functions = {
	get: {desc: 'get user object', params: {uid:{dtype:'string'}}, security: []},
	set: {desc: 'set user object', params: {uid:{dtype:'string'}, user: {dtype: 'object'}}, security: []},
	games: {desc: 'list games user is playing', params: {}, security: []},
	gameRemove: {desc: 'remove a game from the playing list', params: {gameId:{dtype:'string'}}, security: []}
};

user.errors = {
	100: "get user object failed",
	101: "set user object failed",
	102: "set user object failed, unable to load merge"
}

user.pre = function(req, res, cb)
{
	console.log('user.pre');
	var uid = req.params.uid;
	// user is always preloaded now
	
	// SWD - eventually check security session.uid has rights to params.uid
	cb(0);
}

user.post = function(req, res, cb)
{
	console.log('user.post');
	var uid = req.params.uid;
	// SWD: work out pre/post user save later, for now save on every set
	cb(0);
}

user.get = function(req, res, cb)
{
	console.log(req.env.user);
	cb(0, req.session.user.getData());
}

user.set = function(req, res, cb)
{
	var newUser = req.params.user;

	req.session.user.setData(newUser);

	cb(0, req.session.user.getData());
}

user.games = function(req, res, cb)
{
	cb(0, shutil.event("event.user.games", req.session.user.get('currentGames')));
}

user.gameRemove = function(req, res, cb)
{
	var gameId = req.params.gameId;
	var user = req.session.user;
	var currentGames = user.get('currentGames');
	delete currentGames[gameId];
	user.set(currentGames);
	
	cb(0, shutil.event("event.user.games", currentGames));
}