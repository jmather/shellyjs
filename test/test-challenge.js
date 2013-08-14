var request = require("supertest");
var should = require("should");
var _ = require("lodash");
var st = require("./shtest.js");
var ShConnect = require("./shconnect.js");

/*global describe, before, after, it*/

var gEmail1 = "test1@lgdales.com";
var gEmail2 = "test2@lgdales.com";
var gEmail3 = "test3@lgdales.com";
var gPassword = "foofoo";
var gConn1 = null;
var gConn2 = null;
var gConn3 = null;
var gConnAdmin = null;
var gConns = [];
var gGameName = "tictactoe";
var gSChId = null;
var gRChId = null;
var gGameId = null;

describe("challenge module", function () {

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
          gConnAdmin.call("reg.remove", {email: gEmail3}, function (err, res) {
            res[0].should.have.property("event", "reg.remove");
            done();
          });
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

  describe("user1 challenge user2", function () {
    it("user1 make", function (done) {
      gConn1.call("challenge.make", {game: gGameName, toUid: gConn2.uid()},
        function (err, res) {
          res[0].should.have.property("event", "challenge.make");
          res[0].data.should.have.property("chId");
          res[0].data.should.have.property("sent");
          res[0].data.sent.should.have.property("toUid", gConn2.uid());
          gSChId = res[0].data.chId;
          done();
        });
    });
    it("user1 verify sent", function (done) {
      gConn1.call("challenge.listSent", {},
        function (err, res) {
          res[0].should.have.property("event", "challenge.listSent");
          res[0].data.should.have.property(gSChId);
          res[0].data[gSChId].should.have.property("toUid", gConn2.uid());
          res[0].data[gSChId].should.have.property("game", gGameName);
          done();
        });
    });
    it("user2 verify recieved", function (done) {
      gConn2.call("challenge.list", {},
        function (err, res) {
          res[0].should.have.property("event", "challenge.list");
          gRChId = gConn1.uid() + ":" + gGameName;
          res[0].data.should.have.property(gRChId);
          res[0].data[gRChId].should.have.property("fromUid", gConn1.uid());
          res[0].data[gRChId].should.have.property("game", gGameName);
          done();
        });
    });
  });

  describe("user2 accept user1's challenge", function () {
    it("user2 accept", function (done) {
      gConn2.call("challenge.accept", {chId: gRChId},
        function (err, res) {
          res[0].should.have.property("event", "challenge.accept");
          res[1].should.have.property("event", "challenge.start");
          res[1].data.should.have.property("gameId");
          gGameId = res[1].data.gameId;
          done();
        });
    });
    it("user1 verify sent removed", function (done) {
      gConn1.call("challenge.listSent", {},
        function (err, res) {
          res[0].should.have.property("event", "challenge.listSent");
          res[0].data.should.not.have.property(gSChId);
          done();
        });
    });
    it("user2 verify recv removed", function (done) {
      gConn2.call("challenge.list", {},
        function (err, res) {
          res[0].should.have.property("event", "challenge.list");
          res[0].data.should.not.have.property(gRChId);
          done();
        });
    });
    it("verify game", function (done) {
      gConn2.call("game.get", {gameId: gGameId},
        function (err, res) {
          res[0].should.have.property("event", "game.get");
          res[0].data.should.have.property("name", gGameName);
          res[0].data.should.have.property("players");
          res[0].data.players.should.have.property(gConn1.uid());
          res[0].data.players.should.have.property(gConn2.uid());
          res[0].data.should.have.property("playerOrder");
          res[0].data.playerOrder.should.have.length(2);
          done();
        });
    });
  });

  describe("user2 decline user1", function () {
    it("user1 make", function (done) {
      gConn1.call("challenge.make", {game: gGameName, toUid: gConn2.uid()},
        function (err, res) {
          res[0].should.have.property("event", "challenge.make");
          res[0].data.should.have.property("chId");
          res[0].data.should.have.property("sent");
          res[0].data.sent.should.have.property("toUid", gConn2.uid());
          gSChId = res[0].data.chId;
          done();
        });
    });
    it("user1 verify sent", function (done) {
      gConn1.call("challenge.listSent", {},
        function (err, res) {
          res[0].should.have.property("event", "challenge.listSent");
          res[0].data.should.have.property(gSChId);
          res[0].data[gSChId].should.have.property("toUid", gConn2.uid());
          res[0].data[gSChId].should.have.property("game", gGameName);
          done();
        });
    });
    it("user2 verify recieved", function (done) {
      gConn2.call("challenge.list", {},
        function (err, res) {
          res[0].should.have.property("event", "challenge.list");
          gRChId = gConn1.uid() + ":" + gGameName;
          res[0].data.should.have.property(gRChId);
          res[0].data[gRChId].should.have.property("fromUid", gConn1.uid());
          res[0].data[gRChId].should.have.property("game", gGameName);
          done();
        });
    });
    it("user2 decline", function (done) {
      gConn2.call("challenge.decline", {chId: gRChId},
        function (err, res) {
          res[0].should.have.property("event", "challenge.decline");
          res[0].data.should.have.property("chId", gRChId);
          done();
        });
    });
    it("user1 verify send removed", function (done) {
      gConn1.call("challenge.listSent", {},
        function (err, res) {
          res[0].should.have.property("event", "challenge.listSent");
          res[0].data.should.not.have.property(gSChId);
          done();
        });
    });
    it("user2 verify recv removed", function (done) {
      gConn2.call("challenge.list", {},
        function (err, res) {
          res[0].should.have.property("event", "challenge.list");
          res[0].data.should.not.have.property(gRChId);
          done();
        });
    });
  });

  describe("user1 withdraw user2's challenge", function () {
    it("user1 make", function (done) {
      gConn1.call("challenge.make", {game: gGameName, toUid: gConn2.uid()},
        function (err, res) {
          res[0].should.have.property("event", "challenge.make");
          res[0].data.should.have.property("chId");
          res[0].data.should.have.property("sent");
          res[0].data.sent.should.have.property("toUid", gConn2.uid());
          gSChId = res[0].data.chId;
          done();
        });
    });
    it("user1 verify sent", function (done) {
      gConn1.call("challenge.listSent", {},
        function (err, res) {
          res[0].should.have.property("event", "challenge.listSent");
          res[0].data.should.have.property(gSChId);
          res[0].data[gSChId].should.have.property("toUid", gConn2.uid());
          res[0].data[gSChId].should.have.property("game", gGameName);
          done();
        });
    });
    it("user2 verify recieved", function (done) {
      gConn2.call("challenge.list", {},
        function (err, res) {
          res[0].should.have.property("event", "challenge.list");
          gRChId = gConn1.uid() + ":" + gGameName;
          res[0].data.should.have.property(gRChId);
          res[0].data[gRChId].should.have.property("fromUid", gConn1.uid());
          res[0].data[gRChId].should.have.property("game", gGameName);
          done();
        });
    });
    it("user1 withdraw", function (done) {
      gConn1.call("challenge.withdraw", {chId: gSChId},
        function (err, res) {
          res[0].should.have.property("event", "challenge.withdraw");
          res[0].data.should.have.property("chId", gSChId);
          done();
        });
    });
    it("user1 verify removed", function (done) {
      gConn1.call("challenge.listSent", {},
        function (err, res) {
          res[0].should.have.property("event", "challenge.listSent");
          res[0].data.should.not.have.property(gSChId);
          done();
        });
    });
    it("user2 verify removed", function (done) {
      gConn2.call("challenge.list", {},
        function (err, res) {
          res[0].should.have.property("event", "challenge.list");
          res[0].data.should.not.have.property(gRChId);
          done();
        });
    });
  });

  describe("user1 challenge existing email " + gEmail2 + " challenge", function () {
    it("user1 email", function (done) {
      gConn1.call("challenge.email", {game: gGameName, email: gEmail2},
        function (err, res) {
          res[0].should.have.property("event", "challenge.make");
          res[0].data.should.have.property("chId");
          res[0].data.should.have.property("sent");
          res[0].data.sent.should.have.property("toUid"); // toUid is new user
          gSChId = res[0].data.chId;
          done();
        });
    });
    it("user1 verify sent", function (done) {
      gConn1.call("challenge.listSent", {},
        function (err, res) {
          res[0].should.have.property("event", "challenge.listSent");
          res[0].data.should.have.property(gSChId);
          res[0].data[gSChId].should.have.property("toUid", gConn2.uid());
          res[0].data[gSChId].should.have.property("game", gGameName);
          done();
        });
    });
    it("user2 verify recieved", function (done) {
      gConn2.call("challenge.list", {},
        function (err, res) {
          res[0].should.have.property("event", "challenge.list");
          gRChId = gConn1.uid() + ":" + gGameName;
          res[0].data.should.have.property(gRChId);
          res[0].data[gRChId].should.have.property("fromUid", gConn1.uid());
          res[0].data[gRChId].should.have.property("game", gGameName);
          done();
        });
    });
    it("user2 accept", function (done) {
      gRChId = gConn1.uid() + ":" + gGameName;
      gConn2.call("challenge.accept", {chId: gRChId},
        function (err, res) {
          res[0].should.have.property("event", "challenge.accept");
          res[1].should.have.property("event", "challenge.start");
          res[1].data.should.have.property("gameId");
          gGameId = res[1].data.gameId;
          done();
        });
    });
    it("user1 verify sent removed", function (done) {
      gConn1.call("challenge.listSent", {},
        function (err, res) {
          res[0].should.have.property("event", "challenge.listSent");
          res[0].data.should.not.have.property(gSChId);
          done();
        });
    });
    it("user2 verify recv removed", function (done) {
      gConn2.call("challenge.list", {},
        function (err, res) {
          res[0].should.have.property("event", "challenge.list");
          res[0].data.should.not.have.property(gRChId);
          done();
        });
    });
    it("verify game", function (done) {
      gConn1.call("game.get", {gameId: gGameId},
        function (err, res) {
          res[0].should.have.property("event", "game.get");
          res[0].data.should.have.property("name", gGameName);
          res[0].data.should.have.property("players");
          res[0].data.players.should.have.property(gConn1.uid());
          res[0].data.players.should.have.property(gConn2.uid());
          res[0].data.should.have.property("playerOrder");
          res[0].data.playerOrder.should.have.length(2);
          done();
        });
    });
  });

  describe("user1 challenge new email " + gEmail3 + " challenge", function () {
    it("user1 email", function (done) {
      gConn1.call("challenge.email", {game: gGameName, email: gEmail3},
        function (err, res) {
          res[0].should.have.property("event", "challenge.make");
          res[0].data.should.have.property("chId");
          res[0].data.should.have.property("sent");
          res[0].data.sent.should.have.property("toUid"); // toUid is new user
          gSChId = res[0].data.chId;
          done();
        });
    });
    it("login user3", function (done) {
      gConn3 = new ShConnect("localhost");
      gConn3.call("reg.login", {email: gEmail3, password: "XXXXXX"},
        function (err, res) {
          res[0].should.have.property("event", "reg.login");
          gConn3.setSession(res[0].data.session);
          gConns[gConn3.uid()] = gConn3;
          done();
        });
    });
    it("user1 verify sent", function (done) {
      gConn1.call("challenge.listSent", {},
        function (err, res) {
          res[0].should.have.property("event", "challenge.listSent");
          res[0].data.should.have.property(gSChId);
          res[0].data[gSChId].should.have.property("toUid", gConn3.uid());
          res[0].data[gSChId].should.have.property("game", gGameName);
          done();
        });
    });
    it("user3 verify recieved", function (done) {
      gConn3.call("challenge.list", {},
        function (err, res) {
          res[0].should.have.property("event", "challenge.list");
          gRChId = gConn1.uid() + ":" + gGameName;
          res[0].data.should.have.property(gRChId);
          res[0].data[gRChId].should.have.property("fromUid", gConn1.uid());
          res[0].data[gRChId].should.have.property("game", gGameName);
          done();
        });
    });
    it("user3 accept", function (done) {
      gRChId = gConn1.uid() + ":" + gGameName;
      gConn3.call("challenge.accept", {chId: gRChId},
        function (err, res) {
          res[0].should.have.property("event", "challenge.accept");
          res[1].should.have.property("event", "challenge.start");
          res[1].data.should.have.property("gameId");
          gGameId = res[1].data.gameId;
          done();
        });
    });
    it("user1 verify sent removed", function (done) {
      gConn1.call("challenge.listSent", {},
        function (err, res) {
          res[0].should.have.property("event", "challenge.listSent");
          res[0].data.should.not.have.property(gSChId);
          done();
        });
    });
    it("user3 verify recv removed", function (done) {
      gConn3.call("challenge.list", {},
        function (err, res) {
          res[0].should.have.property("event", "challenge.list");
          res[0].data.should.not.have.property(gRChId);
          done();
        });
    });
    it("verify game", function (done) {
      gConn1.call("game.get", {gameId: gGameId},
        function (err, res) {
          res[0].should.have.property("event", "game.get");
          res[0].data.should.have.property("name", gGameName);
          res[0].data.should.have.property("players");
          res[0].data.players.should.have.property(gConn1.uid());
          res[0].data.players.should.have.property(gConn3.uid());
          res[0].data.should.have.property("playerOrder");
          res[0].data.playerOrder.should.have.length(2);
          done();
        });
    });
  });
});