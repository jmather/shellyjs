var util = require("util");
var cluster = require("cluster");
var _ = require("lodash");
var WebSocket = require('ws');

var Ai = require(__dirname + "/../robo/ai.js");
var gAi = null;

var gNumWorkers = 3;
var gMaxUsers = 200;
var gRoundsPerGame = 5;
var gUserTemplate = "joe%d@skool51.com";
var gPassword = "foofoo";
var gTurnSleep = 0;

var gStatResets = 0;

function Player(id) {
  WebSocket.call(this, "ws://localhost:5110");

  this.id = id;
  this.email = util.format(gUserTemplate, id);
  this.session = "";
  this.rounds = 0;

  this.sendCmd = function(cmd, params) {
    var baseCmd = {
      session: this.session,
      cmd: cmd
    };
    var data = _.merge(baseCmd, params);
//  console.log("send:", data);
    this.send(JSON.stringify(data));
  }

  this.startPlaying = function() {
//  sendCmd(ws, "channel.add", {channel: "lobby:tictactoe:0"});
    this.sendCmd("game.playing");  // joins all current games
//  sendCmd(ws, "user.get");  // test call for just connect
  }

  this.makeMove = function(game) {
    var side = "O";
    if (game.state.xes === this.uid) {
      side = "X";
    }
    var ai = new Ai(side);
    var move = ai.calculateMove(game.state.gameBoard);
    this.sendCmd("game.turn", {gameId: game.oid, move: {x: move[1], y: move[0]}});
  }

  this.on('open', function () {
    if (this.id % 500 === 0) {
      console.log("connect:", this.email);
    }
    this.sendCmd("reg.login", {email: this.email, password: gPassword});
  });

  this.on('close', function () {
//    console.log("socket closed");
  });

  this.on('error', function (error) {
    console.error(error);
    console.error(error.stack);
  });

  this.on('message', function (message) {
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
      this.sendCmd("reg.create", {email: this.email, password: gPassword});
    } else if (msg.event === "reg.create" || msg.event === "reg.login") {
      this.session = msg.data.session;
      this.uid = msg.data.uid;
      this.startPlaying();
    } else if (msg.event === "match.made") {
      this.sendCmd("game.join", {gameId: msg.data.gameId});
      this.sendCmd("channel.add", {channel: "game:" + msg.data.gameId});
    } else if (msg.event === "game.get"
      || msg.event === "game.join") {
      var self = this;
      if (msg.data.status === "over" && msg.data.state.lastMove.uid === this.uid) {
        this.sendCmd("game.reset", {gameId: msg.data.oid});
      } else if (msg.data.whoTurn === this.uid  && msg.data.status !== "over") {
        setTimeout(function () {
          self.makeMove(msg.data);
        }, gTurnSleep);
      }
    } else if (msg.event === "game.playing") {
      if (Object.keys(msg.data).length === 0) {
        this.sendCmd("match.add", {name: "tictactoe"});
      } else {
        var self = this;
        _.each(msg.data, function (gameInfo, gameId) {
          self.sendCmd("channel.add", {channel: "game:" + gameId});
          if(gameInfo.whoTurn === self.uid || gameInfo.status === "over") {
            self.sendCmd("game.get", {gameId: gameId});  // trigger a move base on gameBoard
          }
      });
      }
    } else if (msg.event === "game.turn.next") {
      if (msg.data.whoTurn === this.uid) {
        this.sendCmd("game.get", {gameId: msg.data.gameId});  // trigger a move base on gameBoard
      }
    } else if (msg.event === "game.over") {
      if (msg.data.ownerId !== this.uid) {
        return;
      }
      if (this.rounds >= gRoundsPerGame) {
        console.log("player:", this.email, "done with resets")
        return;
      }
      // play again
      this.rounds += 1;
      this.sendCmd("game.reset", {gameId: msg.data.oid});
      gStatResets += 1;
      if (gStatResets % 100 === 0) {
        console.log("game.reset", gStatResets);
      }
    }
  });
}

util.inherits(Player, WebSocket);

function createUsers(start, userCount) {
  if (userCount === gMaxUsers) {
    console.log("users create done:", start, start+gMaxUsers)
    return;
  }

  var p = new Player(start + userCount);
  createUsers(start, userCount + 1);
}

if (cluster.isMaster) {
  for (i = 0; i < gNumWorkers; i += 1) {
    var p = cluster.fork({userStart: i*gMaxUsers});
  }
} else {
  var userStart = parseInt(process.env.userStart);
  process.title = "shelly - bench " + userStart + "-" + (userStart + gMaxUsers);
  console.log("worker starting:", process.env.userStart, userStart + gMaxUsers);
  createUsers(parseInt(process.env.userStart), 0);
}


