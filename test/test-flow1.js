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

function playGame() {
  it("turn 1", function (done) {
    gConns[gWhoTurn].call("game.turn", {gameId: gGameId, move: {x: 0, y: 0}},
      function (err, res) {
        res[0].should.not.have.property("event", "error");
        gWhoTurn = res[0].data.whoTurn;
        done();
      });
  });
  it("turn 2", function (done) {
    gConns[gWhoTurn].call("game.turn", {gameId: gGameId, move: {x: 0, y: 1}},
      function (err, res) {
        res[0].should.not.have.property("event", "error");
        gWhoTurn = res[0].data.whoTurn;
        done();
      });
  });
  it("turn 3", function (done) {
    gConns[gWhoTurn].call("game.turn", {gameId: gGameId, move: {x: 1, y: 0}},
      function (err, res) {
        res[0].should.not.have.property("event", "error");
        gWhoTurn = res[0].data.whoTurn;
        done();
      });
  });
  it("turn 4", function (done) {
    gConns[gWhoTurn].call("game.turn", {gameId: gGameId, move: {x: 1, y: 1}},
      function (err, res) {
        res[0].should.not.have.property("event", "error");
        gWhoTurn = res[0].data.whoTurn;
        done();
      });
  });
  it("turn 5 - winning", function (done) {
    gConns[gWhoTurn].call("game.turn", {gameId: gGameId, move: {x: 2, y: 0}},
      function (err, res) {
        res[0].should.have.property("event", "event.game.over");
        res[0].data.should.have.property("whoTurn", "0");
        done();
      });
  });
}

describe("basic user create and game play", function () {

  before(function (done) {
    gConn1 = new ShConnect("localhost");
    gConn2 = new ShConnect("localhost");
    gConnAdmin = new ShConnect("localhost");
    gConnAdmin.login("shelly", "", function (err, res) {
      res[0].should.not.have.property("event", "error");
      // pre-mop up these users
      gConnAdmin.call("reg.remove", {email: gEmail1}, function (err, res) {
        res[0].should.not.have.property("event", "error");
        gConnAdmin.call("reg.remove", {email: gEmail2}, function (err, res) {
          res[0].should.not.have.property("event", "error");
          done();
        });
      });
    });
  });

  describe("setup user1", function () {
    it("register user1", function (done) {
      gConn1.call("reg.create", {email: gEmail1, password: gPassword},
        function (err, res) {
          res[0].should.not.have.property("event", "error");
          gConn1.setSession(res[0].data.session);
          gConns[gConn1.uid()] = gConn1;
          done();
        });
    });
  });

  describe("setup user2", function () {
    it("register user2", function (done) {
      gConn1.call("reg.create", {email: gEmail2, password: gPassword},
        function (err, res) {
          res[0].should.not.have.property("event", "error");
          gConn2.setSession(res[0].data.session);
          gConns[gConn2.uid()] = gConn2;
          done();
        });
    });
  });

  describe("both users add a match", function () {
    it("user1 match", function (done) {
      gConn1.call("match.add", {name: "tictactoe"},
        function (err, res) {
          res[0].should.not.have.property("event", "error");
          res[0].data.should.have.property("uid", gConn1.uid());
          done();
        });
    });
    it("user2 match", function (done) {
      gConn2.call("match.add", {name: "tictactoe"},
        function (err, res) {
          // res[0] is create message
          res[1].should.not.have.property("event", "error");
          res[1].data.should.have.property("gameId");
          gGameId = res[1].data.gameId;
          done();
        });
    });
  });


  describe("both users join the matched game", function () {
    it("user1 join", function (done) {
      gConn1.call("game.join", {gameId: gGameId},
        function (err, res) {
          res[0].should.not.have.property("event", "error");
          done();
        });
    });
    it("user2 join", function (done) {
      gConn2.call("game.join", {gameId: gGameId},
        function (err, res) {
          res[0].should.not.have.property("event", "error");
          gWhoTurn = res[0].data.whoTurn;
          console.log(gWhoTurn);
          done();
        });
    });
  });

  describe("take turns", function () {
    playGame();
  });

  describe("reset game", function () {
    it("reset", function (done) {
      gConn1.call("game.reset", {gameId: gGameId},
        function (err, res) {
          res[0].should.not.have.property("event", "error");
          done();
        });
    });
  });

  describe("take turns", function () {
    playGame();
  });

  describe("both users leave game", function () {
    it("user1 leave", function (done) {
      gConn1.call("game.leave", {gameId: gGameId},
        function (err, res) {
          res[0].should.not.have.property("event", "error");
          done();
        });
    });
    it("user2 leave", function (done) {
      gConn2.call("game.leave", {gameId: gGameId},
        function (err, res) {
          res[0].should.not.have.property("event", "error");
          done();
        });
    });
  });

});