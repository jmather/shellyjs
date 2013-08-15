var _ = require("lodash");
var WebSocket = require('ws');


var ws = new WebSocket('ws://localhost:5110');
var gWaitInt = 0;

var gMoveSet = [
  [0, 0],
  [0, 1],
  [0, 2],
  [1, 0],
  [1, 1],
  [1, 2],
  [2, 0],
  [2, 1],
  [2, 2]
];

var gSession = "1:51:xxxx:0";
var gUid = "51";

function sendCmd(cmd, params) {
  var baseCmd = {
    session: gSession,
    cmd: cmd
  };

  var data = _.merge(baseCmd, params);
  console.log("send:", data);
  ws.send(JSON.stringify(data));
}

function waitForGame() {
  sendCmd("match.count", {name: "tictactoe"});
}

ws.on('open', function () {
  sendCmd("channel.add", {channel: "lobby:0"});
  sendCmd("game.playing");
  gWaitInt = setInterval(waitForGame, 5000);
});

ws.on('close', function () {
  console.log("socket closed");
  clearInterval(gWaitInt);
});

ws.on('error', function (error) {
  console.log(error);
});

function makeMove(game) {
  var i = 0;
  for (i = 0; i < 3; i += 1) {
    var j = 0;
    for (j = 0; j < 3; j += 1) {
      if (game.state.gameBoard[i][j] === "") {
        sendCmd("game.turn", {gameId: game.oid, move: {x: i, y: j}});
        return;
      }
    }
  }
}

ws.on('message', function (message) {
  console.log('received: %s', message);
  var msg = null;
  try {
    msg = JSON.parse(message);
  } catch (e) {
    console.error("unabel to parse message", e.toString());
    return;
  }
  if (msg.event === "match.count") {
    if (msg.data.waiting > 0) {
      sendCmd("match.add", {name: "tictactoe"});
    }
  } else if (msg.event === "match.made") {
    sendCmd("game.join", {gameId: msg.data.gameId});
    sendCmd("channel.add", {channel: "game:" + msg.data.gameId});
  } else if (msg.event === "game.get"
      || msg.event === "game.reset"
      || msg.event === "game.join") {
    if (msg.data.whoTurn === gUid) {
      setTimeout(function () {
        makeMove(msg.data);
      }, 1000);
    }
  } else if (msg.event === "game.playing") {
    _.each(msg.data, function (gameInfo, gameId) {
      sendCmd("channel.add", {channel: "game:" + gameId});
      if(gameInfo.whoTurn === gUid) {
        sendCmd("game.get", {gameId: gameId});  // trigger a move base on gameBoard
      }
    });
  } else if (msg.event === "game.turn.next") {
    if (msg.data.whoTurn === gUid) {
      sendCmd("game.get", {gameId: msg.data.gameId});  // trigger a move base on gameBoard
    }
  }
});