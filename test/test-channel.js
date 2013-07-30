var request = require("supertest");
var should = require("should");
var _ = require("lodash");
var st = require("./shtest.js");

/*global describe, before, it*/

var gEmail = "test@lgdales.com";
var gPassword = "foofoo";
var gChannel = "lobby:0";

describe("module channel", function () {

  before(function (done) {
    st.init(gEmail, gPassword, function (err, res) {
      done();
    });
  });

  describe("CMD channel.list", function () {
    it("list users online", function (done) {
      st.userCall({cmd: "channel.list", channel: gChannel},
        function (err, res) {
          res.body.should.have.property("event", "channel.list");
          done();
        });
    });
  });

  describe("CMD channel.send", function () {
    it("send a messge to a channel", function (done) {
      st.userCall({cmd: "channel.send", channel: gChannel, message: "here me foo"},
        function (err, res) {
          res.body.should.have.property("event", "channel.send");
          done();
        });
    });
  });

  describe("CMD channel.add", function () {
    it("listen for events on this channel", function (done) {
      st.userCall({cmd: "channel.add", channel: gChannel},
        function (err, res) {
          // not a valid rest command
          res.body.should.have.property("event", "error");
          done();
        });
    });
  });

  describe("CMD channel.remove", function () {
    it("stop listening for events on this channel", function (done) {
      st.userCall({cmd: "channel.remove", channel: gChannel},
        function (err, res) {
          // not a valid rest command
          res.body.should.have.property("event", "error");
          done();
        });
    });
  });

});