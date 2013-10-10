var util = require("util");
var cluster = require("cluster");
var _ = require("lodash");
var WebSocket = require('ws');

var Ai = require(__dirname + "/../robo/ai.js");
var gAi = null;

var gNumWorkers = 2;
var gMaxUsers = 20;
var gRoundsPerGame = 100;
var gUserTemplate = "joe%d@skool51.com";
var gPassword = "foofoo";
var gTurnSleep = 0;
var gPlayerDone = 0;

var gStatResets = 0;

function Player(id) {
  WebSocket.call(this, "ws://localhost:5110");

  this.id = id;
  this.email = util.format(gUserTemplate, id);
  this.session = "";
  this.rounds = 0;
  this.joined = false;

  this.sendCmd = function (cmd, params) {
    var baseCmd = {
      session: this.session,
      cmd: cmd
    };
    var data = _.merge(baseCmd, params);
    //console.log("send:", this.email, cmd);
    this.send(JSON.stringify(data));
  };

  this.startPlaying = function () {
//  sendCmd(ws, "channel.add", {channel: "lobby:tictactoe:0"});
    this.sendCmd("game.playing");  // joins all current games
//  sendCmd(ws, "user.get");  // test call for just connect
  };

  this.makeMove = function (game) {
    var side = "O";
    if (game.state.xes === this.uid) {
      side = "X";
    }
    var ai = new Ai(side);
    var move = ai.calculateMove(game.state.gameBoard);
    //console.log("make move:", this.email, move);
    this.sendCmd("game.turn", {gameId: game.oid, move: {x: move[1], y: move[0]}});
  };

  this.resetGame = function (gameId) {
    this.rounds += 1;
    this.sendCmd("game.reset", {gameId: gameId});
    gStatResets += 1;
    if (gStatResets % 100 === 0) {
      console.log("game.reset", gStatResets);
    }
  };

  this.on('open', function () {
    if (this.id % 500 === 0) {
      console.log("connect:", this.email);
    }
    this.sendCmd("reg.check", {email: this.email});
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
    //console.log("received", this.email, msg.event);
    if (msg.event === "reg.check") {
      if (msg.data.status === "used") {
        this.sendCmd("reg.login", {email: this.email, password: gPassword});
      } else {
        this.sendCmd("reg.create", {email: this.email, password: gPassword});
      }
    } else if (msg.event === "reg.create" || msg.event === "reg.login") {
      this.session = msg.data.session;
      this.uid = msg.data.uid;
      this.startPlaying();
    } else if (msg.event === "game.playing") {
      if (Object.keys(msg.data).length === 0) {
        this.sendCmd("match.add", {name: "tictactoe"});
      } else {
        var self = this;
        _.each(msg.data, function (gameInfo, gameId) {
          self.sendCmd("channel.add", {channel: "game:" + gameId});
          self.sendCmd("game.join", {gameId: gameId});
        });
      }
    } else if (msg.event === "match.made") {
      this.sendCmd("channel.add", {channel: "game:" + msg.data.gameId});
      this.sendCmd("game.join", {gameId: msg.data.gameId});
    } else if (msg.event === "game.join") {
      this.joined = true;
      //console.log("game.join", this.email, msg.data.state.gameBoard);
      if (msg.data.status === "over" && msg.data.ownerId === this.uid) {
        this.resetGame(msg.data.oid);  // reset does a game.turn.next
        return;
      }
      //console.log(msg.data.whoTurn, this.uid);
      if (msg.data.status !== "over" && msg.data.whoTurn === this.uid) {
        //console.log("game.get", this.email, msg.data.state.gameBoard);
        this.sendCmd("game.get", {gameId: msg.data.oid});  // trigger a move base on gameBoard
        return;
      }
    } else if (msg.event === "game.get") {
      if (!this.joined) {
        console.log("SWD - get before join", this.email);
        return;
      }
      //console.log("whoTurn:", msg.data.whoTurn, "me:", this.uid, "status:", msg.data.status);
      var self1 = this;
      if (msg.data.whoTurn === this.uid  && msg.data.status !== "over") {
        setTimeout(function () {
          self1.makeMove(msg.data);
        }, gTurnSleep);
      }
    } else if (msg.event === "game.turn.next") {
      if (!this.joined) {
        console.log("SWD - turn before join", this.email);
        return;
      }
      if (msg.data.whoTurn === this.uid && msg.data.status !== "over") {
        this.sendCmd("game.get", {gameId: msg.data.gameId});  // trigger a move base on gameBoard
      }
    } else if (msg.event === "game.over") {
      if (!this.joined) {
        console.log("SWD - over before join", this.email);
        return;
      }
      if (msg.data.ownerId !== this.uid) {
        return;
      }
      if (this.rounds >= gRoundsPerGame) {
        console.log("player:", this.email, "done with resets");
        gPlayerDone += 1;
        if (gPlayerDone >= gMaxUsers / 2) {
          console.log("all users done:", gPlayerDone + " of " + gMaxUsers);
          process.exit();
        }
        return;
      }
      this.resetGame(msg.data.oid);
    }
  });
}

util.inherits(Player, WebSocket);

function createUsers(start, userCount) {
  if (userCount === gMaxUsers) {
    console.log("users create done:", start, start + gMaxUsers);
    return;
  }

  var p = new Player(start + userCount);
  createUsers(start, userCount + 1);
}

if (cluster.isMaster) {
  var i = 0;
  for (i = 0; i < gNumWorkers; i += 1) {
    var p = cluster.fork({userStart: i * gMaxUsers});
  }
} else {
  var userStart = parseInt(process.env.userStart, 10);
  process.title = "shelly - bench " + userStart + "-" + (userStart + gMaxUsers);
  console.log("worker starting:", process.env.userStart, userStart + gMaxUsers);
  createUsers(parseInt(process.env.userStart, 10), 0);
}