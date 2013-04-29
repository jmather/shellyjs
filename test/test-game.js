var request = require("supertest");
var should = require("should");
var _ = require("lodash");
var st = require("./shtest.js");

/*global describe, before, it*/

var gEmail = "test@lgdales.com";
var gPassword = "foofoo";
var gCurrentGame = "";

describe("module game", function () {

  before(function (done) {
    st.init(gEmail, gPassword, function (err, res) {
      done();
    });
  });

  describe("CMD game.create", function () {
    it("respond with valid game", function (done) {
      st.userCall({cmd: "game.create", name: "tictactoe"},
        function (err, res) {
          res.body.data.should.have.property("name", "tictactoe");
          res.body.data.should.have.property("oid");
          res.body.data.should.have.property("state");
          gCurrentGame = res.body.data.oid;
          done();
        });
    });
  });
  describe("CMD game.get", function () {
    it("respond with valid game", function (done) {
      st.userCall({cmd: "game.get", gameId: gCurrentGame},
        function (err, res) {
          res.body.data.should.have.property("name", "tictactoe");
          res.body.data.should.have.property("oid");
          res.body.data.should.have.property("state");
          done();
        });
    });
  });

  describe("CMD game.reset", function () {
    it("respond with valid game", function (done) {
      st.userCall({cmd: "game.reset", gameId: gCurrentGame},
        function (err, res) {
          res.body.data.should.have.property("name", "tictactoe");
          res.body.data.should.have.property("oid");
          res.body.data.should.have.property("state");
          done();
        });
    });
  });

  describe("CMD game.playing", function () {
    it("list games user is playing", function (done) {
      st.userCall({cmd: "game.playing"},
        function (err, res) {
          res.body.should.not.have.property("event", "error");
          done();
        });
    });
  });

  describe("CMD game.list", function () {
    it("list games available to user", function (done) {
      st.userCall({cmd: "game.list"},
        function (err, res) {
          res.body.should.have.property("event", "event.game.list");
          done();
        });
    });
  });

});