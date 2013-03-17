var _ = require("lodash");
var WebSocket = require('ws');


var ws = new WebSocket('ws://localhost:5102');
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
  sendCmd("match.stats", {name: "tictactoe"});
}

ws.on('open', function () {
  sendCmd("live.user", {status: "on"});
  gWaitInt = setInterval(waitForGame, 5000);
});

function makeMove(game) {
  for (var i=0; i<3; i++) {
    for (var j=0; j<3; j++) {
      if (game.state.gameBoard[i][j] === "") {
        sendCmd("game.turn", {gameId: game.gameId, move: {x: i, y: j}});
        return;
      }
    }
  }
}

ws.on('message', function (message) {
  console.log('received: %s', message);
  var msg = JSON.parse(message);
  if (msg.event === "event.match.stats") {
    if (msg.data["tictactoe"].waiting > 0) {
//      clearInterval(gWaitInt);
      sendCmd("match.add", {name: "tictactoe"});
    }
  } else if (msg.event === "event.match.made") {
    sendCmd("game.join", {gameId: msg.data.gameId});
  } else if (msg.event === "event.game.info" || msg.event === "event.game.join") {
    if (msg.data.whoTurn === gUid) {
      makeMove(msg.data);
    }
  } else if (msg.event === "event.game.turn.next") {
    if (msg.data.whoTurn === gUid) {
      sendCmd("game.get", {gameId: msg.data.gameId});  // trigger a move base on gameBoard
    }
  }
});