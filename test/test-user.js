var request = require('supertest');
var should = require('should');
var _ = require('lodash');

request = request('http://localhost:5101');
var data = {session: '1:33:xxxx:0', uid: "33", cmd: ""};

describe('CMD user.get', function(){
  it('respond with valid json user', function(done){
		var req = _.clone(data);
		req.cmd = "user.get";
    request.post('/api').send(req)
		  .set('Accept', 'application/json')	
      .expect(200)
      .end(function(err, res) {
				should.not.exist(err);
				res.should.be.json;
				should.exist(res.body.currentGames);
        done()
      });
  })
})
