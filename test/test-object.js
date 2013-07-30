var request = require("supertest");
var should = require("should");
var _ = require("lodash");
var st = require("./shtest.js");

/*global describe, before, it*/

var gEmail = "test@lgdales.com";
var gPassword = "foofoo";
var gOid = "";

describe("module object", function () {

  before(function (done) {
    st.init(gEmail, gPassword, function (err, res) {
      done();
    });
  });

  describe("CMD object.create", function () {
    it("create a new object", function (done) {
      st.userCall({cmd: "object.create", object: {}},
        function (err, res) {
          res.body.should.have.property("event", "object.create");
          res.body.data.should.have.property("oid");
          gOid = res.body.data.oid;
          done();
        });
    });
  });

  describe("CMD object.set", function () {
    it("set a value in an existing object", function (done) {
      st.userCall({cmd: "object.set", oid: gOid, object: {test: "foo"}},
        function (err, res) {
          res.body.should.have.property("event", "object.set");
          res.body.data.should.have.property("test", "foo");
          done();
        });
    });
  });

  describe("CMD object.get", function () {
    it("get an existing object", function (done) {
      st.userCall({cmd: "object.get", oid: gOid, object: {test: "foo"}},
        function (err, res) {
          res.body.should.have.property("event", "object.get");
          res.body.data.should.have.property("test", "foo");
          done();
        });
    });
  });

  describe("CMD object.delete", function () {
    it("delete an existing object", function (done) {
      st.userCall({cmd: "object.delete", oid: gOid},
        function (err, res) {
          res.body.should.have.property("event", "object.delete");
          res.body.data.should.have.property("status", "ok");
          done();
        });
    });
    it("verify delete of object", function (done) {
      st.userCall({cmd: "object.get", oid: gOid},
        function (err, res) {
          res.body.should.have.property("event", "error");
          res.body.should.have.property("code", "object_get");
          done();
        });
    });
  });

});