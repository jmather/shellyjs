var request = require("supertest");
var should = require("should");
var _ = require("lodash");
var st = require("./shtest.js");

/*global describe, before, it*/

var gEmail = "test@lgdales.com";
var gPassword = "foofoo";
var gGameName = "tictactoe";

describe("module match", function () {

  before(function (done) {
    st.init(gEmail, gPassword, function (err, res) {
      // clear the game queue
      st.userCall({cmd: "match.remove", name: gGameName},
        function (err, res) {
          res.body.should.have.property("event", "match.remove");
          done();
        });
    });
  });

  describe("CMD match.list", function () {
    it("list game queue", function (done) {
      st.userCall({cmd: "match.list", name: gGameName},
        function (err, res) {
          res.body.should.have.property("event", "match.list");
          done();
        });
    });
  });

  describe("CMD match.add", function () {
    it("add a user to a game queue", function (done) {
      st.userCall({cmd: "match.add", name: gGameName},
        function (err, res) {
          res.body.should.have.property("event", "match.add");
          done();
        });
    });

    it("verify user is in game queue", function (done) {
      st.userCall({cmd: "match.list", name: gGameName},
        function (err, res) {
          res.body.should.have.property("event", "match.list");
          res.body.data.should.include(st.uid("user"));
          done();
        });
    });

    it("bad game add game queue", function (done) {
      st.userCall({cmd: "match.add", name: "bad"},
        function (err, res) {
          res.body.should.have.property("event", "error");
          done();
        });
    });
  });

  describe("CMD match.remove", function () {
    it("remove a user from a game queue", function (done) {
      st.userCall({cmd: "match.remove", name: "tictactoe"},
        function (err, res) {
          res.body.should.have.property("event", "match.remove");
          done();
        });
    });

    it("verify user is not in game queue", function (done) {
      st.userCall({cmd: "match.list", name: "tictactoe"},
        function (err, res) {
          res.body.should.have.property("event", "match.list");
          res.body.data.should.not.include(st.uid("user"));
          done();
        });
    });

    it("bad game remove game queue", function (done) {
      st.userCall({cmd: "match.remove", name: "bad"},
        function (err, res) {
          res.body.should.have.property("event", "error");
          done();
        });
    });
  });

  describe("CMD match.stats", function () {
    it("get stats for a game queue", function (done) {
      st.userCall({cmd: "match.remove", name: "tictactoe"},
        function (err, res) {
          res.body.should.have.property("event", "match.remove");
          done();
        });
    });
    it("bad game get stats game queue", function (done) {
      st.userCall({cmd: "match.remove", name: "bad"},
        function (err, res) {
          res.body.should.have.property("event", "error");
          done();
        });
    });
  });

});