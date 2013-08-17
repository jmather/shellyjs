var util = require("util");

var shlog = require(global.gBaseDir + "/src/shlog.js");
var ShObject = require(global.gBaseDir + "/src/do/shobject.js");

function Challenges() {
  ShObject.call(this);

  this._keyType = "kChallenges";
  this._keyFormat = "gch:%s";
  this._data = {
    sent: {},
    recieved: {}
  };
}

util.inherits(Challenges, ShObject);
module.exports = Challenges;

function challengeId(uid, game) {
  return uid + ":" + game;
}

Challenges.prototype.addSend = function (toUid, game) {
  shlog.info("shchallenges", "challenge.addSend:", toUid, game);

  var ts = new Date().getTime();
  var chId = challengeId(toUid, game);
  this._data.sent[chId] = {toUid: toUid, game: game, created: ts};

  return chId;
};

Challenges.prototype.removeSend = function (chId) {
  shlog.info("shchallenges", "challenge.removeSend:", chId);

  delete this._data.sent[chId];
};

Challenges.prototype.addRecieved = function (fromUid, game, data) {
  shlog.info("shchallenges", "challenge.addRecieved:", fromUid, game);

  var ts = new Date().getTime();
  var chId = challengeId(fromUid, game);
  this._data.recieved[chId] = {fromUid: fromUid, game: game, data: data, created: ts};

  return chId;
};

Challenges.prototype.removeRecieved = function (chId) {
  shlog.info("shchallenges", "challenge.removeRecieved:", chId);

  delete this._data.recieved[chId];
};