
var util = require('util')
  , events = require('events')
	, _ = require("lodash")
	
	
var db = global.db;

function User() {
  var self = this;
	
	this._dirty = false;
	this._data = {
		currentGames: {}
		};

	this._uid = 0;
}

/**
 * Inherits from EventEmitter.
 */

util.inherits(User, events.EventEmitter);
module.exports = User;

User.prototype.load = function(uid, cb) {
	this._uid = uid;
	
	var self = this;
	db.kget('kUser', uid, function(err, value) {
		if(value == null) {
			cb(100, {info: "unable to load user data"});
			return;
		}
		try {
			var savedData = JSON.parse(value);
			self._data = _.merge(self._data, savedData);
		} catch(e) {
			cb(100, {info: "unable to parse user data", extra: e.message});
			return;
		}
		cb(0, self._data);
	});
}

User.prototype.loadOrCreate = function(uid, cb) {
	var self = this;
	this.load(uid, function(error, value) {
		if(error != 0) {
			self.save(cb);
		} else {
			cb(0, self._data);
		}
	});
}

User.prototype.save = function(cb) {
	var dataStr = JSON.stringify(this._data);
	db.kset('kUser', this._uid, dataStr, function(err, res) {
		if(err != null) {
			cb(101, {info: "unable to save user data"});
			return;
		}
		cb(0);
	});
}

User.prototype.get = function(key) {
	return this._data[key];
}

User.prototype.set = function(key, value) {
	this._dirty = true;
	this._data[key] = value;
	// temp save until we figure out user pre/post save
	this.save(function(error, data) {
		// don't care for now
	});
}

User.prototype.getData = function() {
	return this._data;
}

User.prototype.setData = function(data) {
	this._dirty = true;
	this._data = _.merge(this._data, data);
}

