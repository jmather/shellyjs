var WebSocketServer = require('ws').Server
var events = require('events');

var eventEmitter = new events.EventEmitter();

var shutil = require(global.gBaseDir + '/src/shutil.js');

gPort = 5102;

var live = exports;
var wss = null;

live.notify = function(gameId, data) {
	console.log('notify called');
	eventEmitter.emit('someOccurence', data);
}

live.start = function()
{
  wss = new WebSocketServer({port: gPort});
	console.log("websocket listening: " + gPort)

	wss.on('connection', function(ws) {
		console.log("connect")
		
	  ws.on('message', function(message) {
			console.log('received: %s', message);
//			var wrapper = shutil.wrapper("match.test", 0, null);
//			ws.send(JSON.stringify(wrapper));
		});
		ws.on('error', function(err) {
			console.log(err);
		})
		
		eventEmitter.on('someOccurence', function(message) {
			var wrapper = shutil.wrapper("game.turn", 0, message);
			ws.send(JSON.stringify(wrapper));
	    console.log(message);
		});
	});

	wss.on('disconnect', function(ws) {
		console.log("disconnect")
	});

	wss.on('error', function(err) {
		console.log(err);
	});
}
