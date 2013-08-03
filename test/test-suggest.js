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
var gMatchWait = 7000;

function playGame() {
  it("turn 1", function (done) {
    gConns[gWhoTurn].call("game.turn", {gameId: gGameId, move: {x: 0, y: 0}},
      function (err, res) {
        res[1].should.have.property("event", "game.turn.next");
        gWhoTurn = res[1].data.whoTurn;
        done();
      });
  });
  it("turn 2", function (done) {
    gConns[gWhoTurn].call("game.turn", {gameId: gGameId, move: {x: 0, y: 1}},
      function (err, res) {
        res[1].should.have.property("event", "game.turn.next");
        gWhoTurn = res[1].data.whoTurn;
        done();
      });
  });
  it("turn 3", function (done) {
    gConns[gWhoTurn].call("game.turn", {gameId: gGameId, move: {x: 1, y: 0}},
      function (err, res) {
        res[1].should.have.property("event", "game.turn.next");
        gWhoTurn = res[1].data.whoTurn;
        done();
      });
  });
  it("turn 4", function (done) {
    gConns[gWhoTurn].call("game.turn", {gameId: gGameId, move: {x: 1, y: 1}},
      function (err, res) {
        res[1].should.have.property("event", "game.turn.next");
        gWhoTurn = res[1].data.whoTurn;
        done();
      });
  });
  it("turn 5 - winning", function (done) {
    gConns[gWhoTurn].call("game.turn", {gameId: gGameId, move: {x: 2, y: 0}},
      function (err, res) {
        res[0].should.have.property("event", "game.over");
        res[0].data.should.have.property("whoTurn", "");
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
  });

  describe("list suggestions", function () {
    it("list suggested users", function (done) {
      gConn1.call("suggest.list", {limit: 10},
        function (err, res) {
          res[0].should.have.property("event", "suggest.list");
          done();
        });
    });
  });

  describe("add a user to be suggested", function () {
    it("add the current user to the suggest list", function (done) {
      gConn1.call("suggest.add", {},
        function (err, res) {
          res[0].should.have.property("event", "suggest.add");
          done();
        });
    });
    it("verify the user was added", function (done) {
      gConn2.call("suggest.list", {limit: 10},
        function (err, res) {
          res[0].should.have.property("event", "suggest.list");
          res[0].data.should.have.property(gConn1.uid());
          done();
        });
    });
  });

});