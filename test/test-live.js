var request = require("supertest");
var should = require("should");
var _ = require("lodash");
var st = require("./shtest.js");

/*global describe, before, it*/

var gEmail = "test@lgdales.com";
var gPassword = "foofoo";
var gOid = "";

describe("module live", function () {

  before(function (done) {
    st.init(gEmail, gPassword, function (err, res) {
      done();
    });
  });

  describe("CMD live.list", function () {
    it("list users online", function (done) {
      st.userCall({cmd: "live.list"},
        function (err, res) {
          res.body.should.not.have.property("event", "error");
          done();
        });
    });
  });

  describe("CMD live.message", function () {
    it("send a messge to a user or game", function (done) {
      st.userCall({cmd: "live.message", message: "here me foo", scope: "all", value: ""},
        function (err, res) {
          res.body.should.not.have.property("event", "error");
          done();
        });
    });
  });

  describe("CMD live.user", function () {
    it("listen for live user events", function (done) {
      st.userCall({cmd: "live.user"},
        function (err, res) {
          res.body.should.have.property("event", "error");
          done();
        });
    });
  });

  describe("CMD live.game", function () {
    it("listen for live game events", function (done) {
      st.userCall({cmd: "live.game"},
        function (err, res) {
          res.body.should.have.property("event", "error");
          done();
        });
    });
  });

});