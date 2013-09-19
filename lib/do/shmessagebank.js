var util = require("util");

var shlog = require(global.C.BASE_DIR + "/lib/shlog.js");
var ShObject = require(global.C.BASE_DIR + "/lib/do/shobject.js");

function MessageBank() {
  ShObject.call(this);

  this._keyType = "kMessageBank";
  this._keyFormat = "mb:%s";
  this._data = {
    bank: []
  };
  this._max = 10;
}

util.inherits(MessageBank, ShObject);
module.exports = MessageBank;

MessageBank.prototype.add = function (msg) {
  shlog.info("shmessagebank", "add message:", msg.from, msg.message);

  this._data.bank.push(msg);
  if (this._data.bank.length > this._max) {
    this._data.bank.shift();
  }
};