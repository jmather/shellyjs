var request = require("supertest");
var should = require("should");
var _ = require("lodash");
var st = require("./shtest.js");

/*global describe, before, it*/

var gEmail = "test@lgdales.com";
var gPassword = "foofoo";
var gOid = "";

describe("general negative tests", function () {

  before(function (done) {
    st.init(gEmail, gPassword, function (err, res) {
      done();
    });
  });

  describe("apis and functions", function () {
    it("missing command", function (done) {
      st.userCall({},
        function (err, res) {
          res.body.should.have.property("event", "error");
          done();
        });
    });
    it("bad command request", function (done) {
      st.userCall("bad",
        function (err, res) {
          res.body.should.have.property("event", "error");
          done();
        });
    });
    it("bad command", function (done) {
      st.userCall({cmd: "bad"},
        function (err, res) {
          res.body.should.have.property("event", "error");
          done();
        });
    });
    it("bad api name", function (done) {
      st.userCall({cmd: "bad.config"},
        function (err, res) {
          res.body.should.have.property("event", "error");
          done();
        });
    });
    it("bad function name", function (done) {
      st.userCall({cmd: "api.bad"},
        function (err, res) {
          res.body.should.have.property("event", "error");
          done();
        });
    });
  });

  describe("parameters", function () {
    it("missing param", function (done) {
      st.userCall({cmd: "api.info"},
        function (err, res) {
          res.body.should.have.property("event", "error");
          done();
        });
    });
    it("bad type integer", function (done) {
      st.userCall({cmd: "api.info", name: 0},
        function (err, res) {
          res.body.should.have.property("event", "error");
          done();
        });
    });
    it("bad type object", function (done) {
      st.userCall({cmd: "api.info", name: {}},
        function (err, res) {
          res.body.should.have.property("event", "error");
          done();
        });
    });
    it("bad type array", function (done) {
      st.userCall({cmd: "api.info", name: []},
        function (err, res) {
          res.body.should.have.property("event", "error");
          done();
        });
    });
  });

  describe("security", function () {
    it("no session", function (done) {
      st.call({cmd: "api.core"},
        function (err, res) {
          res.body.should.have.property("event", "error");
          res.body.should.have.property("code", "session-bad");
          done();
        });
    });
    it("bad session format", function (done) {
      st.call({cmd: "api.core", session: "bad"},
        function (err, res) {
          res.body.should.have.property("event", "error");
          res.body.should.have.property("code", "session-bad");
          done();
        });
    });
    it("bad session signature", function (done) {
      st.call({cmd: "api.core", session: "1:foo:foo:0"},
        function (err, res) {
          res.body.should.have.property("event", "error");
          res.body.should.have.property("code", "session-bad");
          done();
        });
    });
    it("bad session data", function (done) {
      st.call({cmd: "api.core", session: "1:13:bad:0"},
        function (err, res) {
          res.body.should.have.property("event", "error");
          res.body.should.have.property("code", "session-bad");
          done();
        });
    });
    it("bad session time", function (done) {
      var parts = st.session("user").split(":");
      var sess = parts[0] + ":" + parts[1] + ":" + parts[2] + ":0";
      st.call({cmd: "api.core", session: sess},
        function (err, res) {
          res.body.should.have.property("event", "error");
          res.body.should.have.property("code", "session-bad");
          done();
        });
    });
    it("no permisions", function (done) {
      st.userCall({cmd: "system.config"},
        function (err, res) {
          res.body.should.have.property("event", "error");
          res.body.should.have.property("code", "function-perms");
          done();
        });
    });
  });

});