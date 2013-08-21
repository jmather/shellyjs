var request = require("supertest");
var should = require("should");
var _ = require("lodash");
var st = require("./shtest.js");

/*global describe, before, it*/

var gEmail = "test@lgdales.com";
var gPassword = "foofoo";

describe("module system", function () {

  before(function (done) {
    st.init(gEmail, gPassword, function (err, res) {
      done();
    });
  });

  describe("CMD system.config", function () {
    it("get server config data", function (done) {
      st.adminCall({cmd: "system.config"},
        function (err, res) {
          res.body.should.have.property("event", "system.config");
          done();
        });
    });
  });

  describe("CMD system.connInfo", function () {
    it("get socket connection info", function (done) {
      st.adminCall({cmd: "system.connInfo"},
        function (err, res) {
          res.body.should.have.property("event", "system.connInfo");
          res.body.should.have.property("data");
          res.body.data.should.have.property("serverId");
          res.body.data.should.have.property("wid");
          res.body.data.should.have.property("wsid");
          done();
        });
    });
  });

  var ts = new Date().getTime();
  describe("CMD system.rawSet", function () {
    it("set object in the datastore with raw key", function (done) {
      st.adminCall({cmd: "system.rawSet", key: "foo", value: {ts: ts}},
        function (err, res) {
          res.body.should.have.property("event", "system.rawSet");
          res.body.should.have.property("data");
          done();
        });
    });
  });

  describe("CMD system.rawGet", function () {
    it("get object from the datastore with raw key", function (done) {
      st.adminCall({cmd: "system.rawGet", key: "foo"},
        function (err, res) {
          res.body.should.have.property("event", "system.rawGet");
          res.body.should.have.property("data");
          res.body.data.should.have.property("key", "foo");
          res.body.data.should.have.property("value");
          res.body.data.value.should.have.property("ts", ts);
          done();
        });
    });
  });

});