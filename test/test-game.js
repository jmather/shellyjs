var request = require('supertest');
var should = require('should');
var _ = require('lodash');

request = request('http://localhost:5101');
var data = {session: '1:33:xxxx:0'};

function validGame(res) {
	res.should.be.json;
	var msg = res.body;
	msg.should.have.property('event', 'event.game.info');
	msg.should.have.property('data');
	msg.data.should.have.property('gameId');
	msg.data.should.have.property('name', 'tictactoe');
	return msg;	
}

describe('CMD game.create', function(){
  it('respond with valid game', function(done){
		var req = _.clone(data);
		req.cmd = "game.create";
		req.name = "tictactoe";
    request.post('/api').send(req)
		  .set('Accept', 'application/json')
      .expect(200)
      .end(function(err, res) {
				should.not.exist(err);
				var game = validGame(res);
//				console.log(msg);
        done();
      });
  })
})

describe('CMD game.get', function(){
  it('respond with valid game', function(done){
		var req = _.clone(data);
		req.cmd = "game.get";
		req.gameId = "193";
    request.post('/api').send(req)
		  .set('Accept', 'application/json')		
      .expect(200)
      .end(function(err, res) {
				should.not.exist(err);
				var game = validGame(res);
//				console.log(msg);
        done();
      });
  })
})
