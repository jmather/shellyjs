var util = require("util");
var _ = require("lodash");
var WebSocket = require('ws');

var Ai = require(__dirname + "/../robo/ai.js");
var gAi = null;

var gMaxUsers = 15000;
var gRoundsPerGame = 10;
var gUserTemplate = "joe%d@skool51.com";
var gPassword = "foofoo";
var gTurnSleep = 0;

function sendCmd(ws, cmd, params) {
  var baseCmd = {
    session: ws.session,
    cmd: cmd
  };

  var data = _.merge(baseCmd, params);
//  console.log("send:", data);
  ws.send(JSON.stringify(data));
}

function makeMove(ws, game) {
  var side = "O";
  if (game.state.xes === ws.uid) {
    side = "X";
  }
  var ai = new Ai(side);
  var move = ai.calculateMove(game.state.gameBoard);
  sendCmd(ws, "game.turn", {gameId: game.oid, move: {x: move[1], y: move[0]}});
}

function startPlaying(ws) {
//  sendCmd(ws, "channel.add", {channel: "lobby:tictactoe:0"});
//  sendCmd(ws, "game.playing");  // joins all current games
  sendCmd(ws, "user.get");  // joins all current games
}

function Player(id) {
  this._ws = new WebSocket('ws://localhost:5110');
  this._ws.id = id;
  this._ws.email = util.format(gUserTemplate, id);
  this._ws.session = "";
  this._ws.rounds = 0;

  this._ws.on('open', function () {
    if (this.id % 500 === 0) {
      console.log("connect:", this.email);
    }
    sendCmd(this, "reg.login", {email: this.email, password: gPassword});
  });

  this._ws.on('close', function () {
//    console.log("socket closed");
  });

  this._ws.on('error', function (error) {
    console.error(error);
    console.error(error.stack);
  });

  this._ws.on('message', function (message) {
    var msg = null;
    try {
      msg = JSON.parse(message);
    } catch (e) {
      console.error("unabel to parse message", e.toString());
      return;
    }
    if (msg.event === "heartbeat") {
      return;
    }
//    console.log("received", this.email, msg.event);
    if (msg.event === "error" && msg.code === "email-bad") {
      sendCmd(this, "reg.create", {email: this.email, password: gPassword});
    } else if (msg.event === "reg.create" || msg.event === "reg.login") {
      this.session = msg.data.session;
      this.uid = msg.data.uid;
      startPlaying(this);
    } else if (msg.event === "match.made") {
      sendCmd(this, "game.join", {gameId: msg.data.gameId});
      sendCmd(this, "channel.add", {channel: "game:" + msg.data.gameId});
    } else if (msg.event === "game.get"
      || msg.event === "game.join") {
      var self = this;
      if (msg.data.status === "over" && msg.data.state.lastMove.uid === this.uid) {
        sendCmd(this, "game.reset", {gameId: msg.data.oid});
      } else if (msg.data.whoTurn === this.uid  && msg.data.status !== "over") {
        setTimeout(function () {
          makeMove(self, msg.data);
        }, gTurnSleep);
      }
    } else if (msg.event === "game.playing") {
      if (Object.keys(msg.data).length === 0) {
        sendCmd(this, "match.add", {name: "tictactoe"});
      } else {
        var self = this;
        _.each(msg.data, function (gameInfo, gameId) {
          sendCmd(self, "channel.add", {channel: "game:" + gameId});
          if(gameInfo.whoTurn === self.uid || gameInfo.status === "over") {
            sendCmd(self, "game.get", {gameId: gameId});  // trigger a move base on gameBoard
          }
      });
      }
    } else if (msg.event === "game.turn.next") {
      if (msg.data.whoTurn === this.uid) {
        sendCmd(this, "game.get", {gameId: msg.data.gameId});  // trigger a move base on gameBoard
      }
    } else if (msg.event === "game.over") {
      if (this.rounds < gRoundsPerGame) {
        // play again
        this.rounds += 1;
        sendCmd(this, "game.reset", {gameId: msg.data.oid});
      }
    }
  });
}

function createUsers(userCount) {
  if (userCount === gMaxUsers) {
    console.log("users create done:", gMaxUsers)
    return;
  }

  var p = new Player(userCount);
  setTimeout(function() {
    createUsers(userCount + 1);
  }, 0)
}

createUsers(0);

//process.on('uncaughtException', function globalErrorCatch(error, p){
//  console.error(error);
//  console.error(error.stack);
//  process.exit();
//});