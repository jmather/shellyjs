
var util = require('util')
  , events = require('events')
	, _ = require("lodash")
	
var shutil = require(global.gBaseDir + '/src/shutil.js');

var db = global.db;

function Game() {
  var self = this;
	
	this._dirty = false;
	this._data = {
//		currentGames: {}
		};

	this._gameId = 0;
}

/**
 * Inherits from EventEmitter.
 */

util.inherits(Game, events.EventEmitter);
module.exports = Game;

Game.prototype.load = function(gameId, cb) {
	this._gameId = gameId;
	
	var self = this;
	db.kget('kGame', gameId, function(err, value) {
		if(value == null) {
			cb(1, shutil.error("game_get", "unable to load game data", {gameId: gameId}));
			return;
		}
		try {
			var savedData = JSON.parse(value);
			self._data = _.merge(self._data, savedData);
		} catch(e) {
			cb(1, shutil.error("game_parse", "unable to parse game data", {gameId: gameId, extra: e.message}));
			return;
		}
		cb(0, self._data);
	});
}

Game.prototype.save = function(cb) {
	var self = this;
	var dataStr = JSON.stringify(this._data);
	db.kset('kGame', this._gameId, dataStr, function(err, res) {
		if(err != null) {
			cb(1, shutil.error("game_save", "unable to save game data", {gameId: self._gameId}));
			return;
		}
		cb(0);
	});
}

Game.prototype.get = function(key) {
	return this._data[key];
}

Game.prototype.set = function(key, value) {
	this._dirty = true;
	this._data[key] = value;
	this.save(function() {
		// SWD: don't care for now
	});

}

Game.prototype.getData = function() {
	return this._data;
}

Game.prototype.setData = function(data) {
	this._dirty = true;
	this._data = _.merge(this._data, data);
}
