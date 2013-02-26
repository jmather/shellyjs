var WebSocketServer = require('ws').Server
var events = require('events');

var eventEmitter = new events.EventEmitter();

var shutil = require(global.gBaseDir + '/src/shutil.js');
var shUser = require(global.gBaseDir + '/src/shuser.js');

gPort = 5102;

var live = exports;
var wss = null;

live.notify = function(gameId, data) {
	console.log('notify called: gameId = ' + gameId);
	var channel = "notify-" + gameId;
	eventEmitter.emit(channel, data);
}

live.start = function() {
  wss = new WebSocketServer({port: gPort});
	console.log("websocket listening: " + gPort)

	wss.on('connection', function(ws) {
		console.log("socket: connect")
		
		var socketNotify = function(message) {}
		
	  ws.on('message', function(message) {
			var req = {};
			var res = {};
			
			// fill in req.params
			req.params = JSON.parse(message);
			
			// fill in req.session
			shutil.fillSession(req, res, function(error, data) {
				if(error != 0) {
					ws.send(JSON.stringify(data));
					return;
				}
				shutil.call(req.params.cmd, req, res, function(error, data) {
					console.log("back from call: " + req.params.cmd);
					var cmd = req.params.cmd;
					if(cmd == 'game.join' || cmd == 'gqueue.nextAvailable') {
						if(error == 0) {
							// let them listen for events, if join or or already playing(106)
							var channel = "notify-" + req.params.gameId;
							console.log("socket: on channel=" + channel);
							eventEmitter.on(channel, socketNotify);					
						}
					}
					ws.send(JSON.stringify(data));
					return;
				});
			});
		});
		ws.on('error', function(err) {
			console.log(err);
		})
	
		var socketNotify = function(message) {
			console.log("socket: socketNotify")
			if(ws.readyState == 1) {
				// 1 = OPEN - SWD: find this in ws module later
				ws.send(JSON.stringify(message));
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
