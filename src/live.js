var WebSocketServer = require('ws').Server
var WebSocket = require('ws').client
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
		console.log("socket: connect")
		
		var socketNotify = function(message) {}
		
	  ws.on('message', function(message) {
			console.log('received: %s', message);
//			var wrapper = shutil.wrapper("match.test", 0, null);
//			ws.send(JSON.stringify(wrapper));
		});
		ws.on('error', function(err) {
			console.log(err);
		})
	
		var socketNotify = function(message) {
			if(ws.readyState == 1) {
				// 1 = OPEN - SWD: find this in ws module later
				var wrapper = shutil.wrapper("game.turn", 0, message);
				wrapper.error = 0;
				ws.send(JSON.stringify(wrapper));
		    console.log(message);
			} else {
				console.log("socket: dead socket");
			}
		};
		eventEmitter.on('someOccurence', socketNotify);
		
		ws.on('close', function(ws) {
			console.log("socket: close")
			eventEmitter.removeListener("someOccurence", socketNotify);
		});

	});
	
	wss.on('error', function(err) {
		console.log(err);
	});
}
