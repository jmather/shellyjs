var request = require("supertest");
var should = require("should");
var _ = require("lodash");
var st = require("./shtest.js");

/*global describe, before, it*/

var gEmail = "test@lgdales.com";
var gPassword = "foofoo";

describe("stats api: " + __filename, function () {

  before(function (done) {
    st.init(gEmail, gPassword, function (err, res) {
      done();
    });
  });

  describe("CMD stats.get", function () {
    it("get server statistics data", function (done) {
      st.adminCall({cmd: "stats.get", domain: "cmds", key: "stats.get"},
        function (err, res) {
          res.body.should.have.property("event", "stats.get");
          done();
        });
    });
  });

  describe("CMD stats.getDomain", function () {
    it("get server statistics data for a domain", function (done) {
      st.adminCall({cmd: "stats.getDomain", domain: "cmds"},
        function (err, res) {
          res.body.should.have.property("event", "stats.getDomain");
          done();
        });
    });
  });

  describe("CMD stats.getAll", function () {
    it("get all server statistics data", function (done) {
      st.adminCall({cmd: "stats.getAll"},
        function (err, res) {
          res.body.should.have.property("event", "stats.getAll");
          done();
        });
    });
  });

});