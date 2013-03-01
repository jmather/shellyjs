var request = require('supertest');
var should = require('should');
var _ = require('lodash');

request = request('http://localhost:5101');
var data = {session: '1:33:xxxx:0'};

describe('CMD reg.check', function(){
  it('respond with valid json session OK', function(done){
		var req = _.clone(data);
		req.cmd = "reg.check";
		req.email = "scott@lgdales.com";
    request.post('/api').send(req)
		  .set('Accept', 'application/json')
      .expect(200)
      .end(function(err, res) {
				should.not.exist(err);
				res.should.be.json;
//				console.log(res.body);
        done()
      });
  })
})
