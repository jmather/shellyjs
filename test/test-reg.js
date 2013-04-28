var request = require('supertest');
var should = require('should');
var _ = require('lodash');

request = request('http://localhost:5101');
var gData = {session: '1:33:xxxx:0'};
var gEmail = "test@lgdales.com";
var gPassword = "foofoo";

function testCall(data, cb) {
  var req = _.clone(gData);
  _.merge(req, data);
  request.post('/api').send(req)
    .set('Accept', 'application/json')
    .expect(200)
    .end(cb);
}

describe("module reg", function () {

  before(function () {
  });

  describe('CMD reg.remove', function () {
    it('respond with no error', function (done) {
      testCall({cmd: "reg.remove", email: gEmail},
        function (err, res) {
          should.not.exist(err);
          res.body.should.not.have.property("event", "error");
          console.log(res.body);
          done();
        });
    });
  });

  describe('CMD reg.create', function () {
    it('respond with valid session', function (done) {
      testCall({cmd: "reg.create", email: gEmail, password: gPassword},
        function (err, res) {
          should.not.exist(err);
          res.body.should.have.property("event", "reg.create");
//				console.log(res.body);
          done();
        });
    });
  });

});