
var util = require('util')
  , events = require('events')
	, _ = require("lodash")
	
var shutil = require(global.gBaseDir + '/src/shutil.js');

var db = global.db;

function Game() {
  var self = this;
	
	var ts = new Date().getTime();
	
	this._dirty = false;
	this._data = {
		gameId: 0,
		name: '',
		ownerId: 0,
		created: ts,
		lastModified: ts,
		status: 'created',
		players: {},
		playerOrder: [],
		whoTurn: 0,
		rounds: 0,
		turnsPlayed: 0
		};
}

/**
 * Inherits from EventEmitter.
 */

util.inherits(Game, events.EventEmitter);
module.exports = Game;

Game.prototype.load = function(gameId, cb) {	
	var self = this;
	db.kget('kGame', gameId, function(err, value) {
		if(value == null) {
			cb(1, shutil.error("game_get", "unable to load game data", {gameId: gameId}));
			return;
		}
		try {
			var savedData = JSON.parse(value);
			// SWD fixup for now
			savedData.gameId = savedData.gameId.toString();			
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
	db.kset('kGame', this._data.gameId, dataStr, function(err, res) {
		if(err != null) {
			cb(1, shutil.error("game_save", "unable to save game data", {gameId: self._data.gameId}));
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
}

Game.prototype.getData = function() {
	return this._data;
}

Game.prototype.setData = function(data) {
	this._dirty = true;
	this._data = _.merge(this._data, data);
}

Game.prototype.setPlayer = function(uid, status) {
	this._dirty = true;
	if(typeof(this._data.players[uid]) == 'undefined') {
		this._data.players[uid] = {status: "ready"};
		if(this._data.playerOrder.indexOf(uid) == -1) {
			this._data.playerOrder.push(uid);
		}
	} else {
		this._data.players[uid].status = status;
	}
}

Game.prototype.removePlayer = function(uid) {
	this._dirty = true;
	delete this._data.players[uid];
}
