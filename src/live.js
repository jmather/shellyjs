var WebSocketServer = require('ws').Server
var events = require('events');

var eventEmitter = new events.EventEmitter();

var shutil = require(global.gBaseDir + '/src/shutil.js');

gPort = 5102;

var live = exports;
var wss = null;

live.notify = function(gameId, data) {
	console.log('notify called: gameId = ' + gameId);
	var channel = "notify-" + gameId;
	eventEmitter.emit(channel, data);
}

live.start = function()
{
  wss = new WebSocketServer({port: gPort});
	console.log("websocket listening: " + gPort)

	wss.on('connection', function(ws) {
		console.log("socket: connect")
		
		var socketNotify = function(message) {}
		
	  ws.on('message', function(message) {
			var params = JSON.parse(message);
			if(params.cmd == 'game.join') {
				var channel = "notify-" + params.gameId;
				console.log("socket: on channel=" + channel);
				eventEmitter.on(channel, socketNotify);
				
			}
			console.log('received: %s', message);
//			var wrapper = shutil.wrapper("match.test", 0, null);
//			ws.send(JSON.stringify(wrapper));
		});
		ws.on('error', function(err) {
			console.log(err);
		})
	
		var socketNotify = function(message) {
			console.log("socket: socketNoitfy")
			if(ws.readyState == 1) {
				// 1 = OPEN - SWD: find this in ws module later
				var wrapper = shutil.wrapper("game.turn", 0, message);
				wrapper.error = 0;
				ws.send(JSON.stringify(wrapper));
			} else {
				console.log("socket: dead socket");
			}
		};
		
		ws.on('close', function(ws) {
			console.log("socket: close")
			eventEmitter.removeListener("someOccurence", socketNotify);
		});

	});
	
	wss.on('error', function(err) {
		console.log(err);
	});
}
