var util = require("util");

var shlog = require(global.gBaseDir + "/src/shlog.js");
var ShObject = require(global.gBaseDir + "/src/shobject.js");

function MessageList() {
  ShObject.call(this);

  this._keyType = "kMessageList";
  this._data = {
    bank: []
  };
  this._max = 10;
}

util.inherits(MessageList, ShObject);
module.exports = MessageList;

MessageList.prototype.add = function (msg) {
  shlog.info("add message:", msg.from, msg.message);

  this._data.bank.push(msg);
  if (this._data.bank.length > this._max) {
    this._data.bank.shift();
  }
};