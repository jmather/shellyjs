var request = require("supertest");
var should = require("should");
var _ = require("lodash");
var st = require("./shtest.js");
var ShConnect = require("./shconnect.js");

/*global describe, before, after, it*/

var gEmail1 = "test1@lgdales.com";
var gEmail2 = "test2@lgdales.com";
var gPassword = "foofoo";
var gConn1 = null;
var gConn2 = null;
var gConnAdmin = null;
var gGameId = "";
var gWhoTurn = "";
var gConns = [];
var gRoundCount = 2;
var gMatchWait = 9000;

function playGame() {
  it("turn 1", function (done) {
    gConns[gWhoTurn].call("game.turn", {gameId: gGameId, move: {x: 0, y: 0}},
      function (err, res) {
        res[1].should.have.property("event", "game.status");
        gWhoTurn = res[1].data.whoTurn;
        done();
      });
  });
  it("turn 2", function (done) {
    gConns[gWhoTurn].call("game.turn", {gameId: gGameId, move: {x: 0, y: 1}},
      function (err, res) {
        res[1].should.have.property("event", "game.status");
        gWhoTurn = res[1].data.whoTurn;
        done();
      });
  });
  it("turn 3", function (done) {
    gConns[gWhoTurn].call("game.turn", {gameId: gGameId, move: {x: 1, y: 0}},
      function (err, res) {
        res[1].should.have.property("event", "game.status");
        gWhoTurn = res[1].data.whoTurn;
        done();
      });
  });
  it("turn 4", function (done) {
    gConns[gWhoTurn].call("game.turn", {gameId: gGameId, move: {x: 1, y: 1}},
      function (err, res) {
        res[1].should.have.property("event", "game.status");
        gWhoTurn = res[1].data.whoTurn;
        done();
      });
  });
  it("turn 5 - winning", function (done) {
    gConns[gWhoTurn].call("game.turn", {gameId: gGameId, move: {x: 2, y: 0}},
      function (err, res) {
        res[0].should.have.property("event", "game.turn");
        res[1].should.have.property("event", "game.status");
        res[1].data.should.have.property("whoTurn", "");
        res[2].should.have.property("event", "game.over");
        done();
      });
  });
}

function playRound() {
  describe("take turns", function () {
    playGame();
  });

  describe("reset game", function () {
    it("reset", function (done) {
      gConn1.call("game.reset", {gameId: gGameId},
        function (err, res) {
          res[0].should.have.property("event", "game.reset");
          gWhoTurn = res[0].data.whoTurn;
          done();
        });
    });
  });
}


describe("basic user create and game play", function () {

  before(function (done) {
    gConn1 = new ShConnect("localhost");
    gConn2 = new ShConnect("localhost");
    gConnAdmin = new ShConnect("localhost");
    gConnAdmin.login("shelly", "shelly", function (err, res) {
      res[0].should.have.property("event", "reg.login");
      // pre-mop up these users
      gConnAdmin.call("reg.remove", {email: gEmail1}, function (err, res) {
        res[0].should.have.property("event", "reg.remove");
        gConnAdmin.call("reg.remove", {email: gEmail2}, function (err, res) {
          res[0].should.have.property("event", "reg.remove");
          done();
        });
      });
    });
  });

  describe("setup match queue", function () {
    it("clear queue", function (done) {
      gConnAdmin.call("match.clear", {name: "tictactoe"},
        function (err, res) {
          res[0].should.have.property("event", "match.clear");
          done();
        });
    });
  });

  describe("setup user1", function () {
    it("register user1", function (done) {
      gConn1.call("reg.create", {email: gEmail1, password: gPassword},
        function (err, res) {
          res[0].should.have.property("event", "reg.create");
          gConn1.setSession(res[0].data.session);
          gConns[gConn1.uid()] = gConn1;
          done();
        });
    });
    it("dequeue user1", function (done) {
      gConn1.call("match.remove", {name: "tictactoe"},
        function (err, res) {
          res[0].should.have.property("event", "match.remove");
          done();
        });
    });
  });

  describe("setup user2", function () {
    it("register user2", function (done) {
      gConn2.call("reg.create", {email: gEmail2, password: gPassword},
        function (err, res) {
          res[0].should.have.property("event", "reg.create");
          gConn2.setSession(res[0].data.session);
          gConns[gConn2.uid()] = gConn2;
          done();
        });
    });
    it("dequeue user2", function (done) {
      gConn2.call("match.remove", {name: "tictactoe"},
        function (err, res) {
          res[0].should.have.property("event", "match.remove");
          done();
        });
    });
  });

  describe("both users add a match", function () {
    it("user1 match", function (done) {
      gConn1.call("match.add", {name: "tictactoe"},
        function (err, res) {
          res[0].should.have.property("event", "match.add");
          res[0].data.should.have.property("uid", gConn1.uid());
          done();
        });
    });
    it("user2 match", function (done) {
      gConn2.call("match.add", {name: "tictactoe"},
        function (err, res) {
          res[0].should.have.property("event", "match.add");
          res[0].data.should.have.property("uid", gConn2.uid());
          done();
        });
    });
    it("user1 gameId", function (done) {
      this.timeout(gMatchWait);
      console.log("waiting for matcher (" + gMatchWait + "ms)");
      setTimeout(function () {
        gConn1.call("game.playing", {},
          function (err, res) {
            res[0].should.have.property("event", "game.playing");
            var gameIds = Object.keys(res[0].data);
            gameIds.should.have.length(1);
            gGameId = gameIds[0];
            done();
          });
      }, 6000);
    });
  });


  describe("both users enter the matched game", function () {
    it("user1 enter", function (done) {
      gConn1.call("game.enter", {gameId: gGameId},
        function (err, res) {
          res[0].should.have.property("event", "game.enter");
          done();
        });
    });
    it("user2 join", function (done) {
      gConn2.call("game.enter", {gameId: gGameId},
        function (err, res) {
          res[0].should.have.property("event", "game.enter");
          res[0].data.should.have.property("whoTurn");
          gWhoTurn = res[0].data.whoTurn;
          done();
        });
    });
  });


  var i = 0;
  for (i = 0; i < gRoundCount; i += 1) {
    playRound();
  }

  describe("both users leave game", function () {
    it("user1 leave", function (done) {
      gConn1.call("game.leave", {gameId: gGameId},
        function (err, res) {
          res[0].should.have.property("event", "game.leave");
          done();
        });
    });
    it("user2 leave", function (done) {
      gConn2.call("game.leave", {gameId: gGameId},
        function (err, res) {
          res[0].should.have.property("event", "game.leave");
          done();
        });
    });
  });

});
