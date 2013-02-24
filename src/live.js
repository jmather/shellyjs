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
			var req = {};
			var res = {};
			
			req.params = JSON.parse(message);
			if(!session.check(req.params.session)) {
				var wrapper = shutil.wrapper("game.turn", 1, "bad session");
				ws.send(JSON.stringify(wrapper));
				return
			}
			req.session = {};
			req.session.uid = req.params.session.split(':')[1];
			
			shutil.call(req.params.cmd, req, res, function(error, data) {
				if(req.params.cmd == 'game.join') {
					if(error == 0 || error == 106) {
						// let them listen for events
						var channel = "notify-" + req.params.gameId;
						console.log("socket: on channel=" + channel);
						eventEmitter.on(channel, socketNotify);					
					}
					var wrapper = shutil.wrapper("game.turn", error, data);
					ws.send(JSON.stringify(wrapper));				
				}
			});
			console.log('received: %s', message);
		});
		ws.on('error', function(err) {
			console.log(err);
		})
	
		var socketNotify = function(message) {
			console.log("socket: socketNotify")
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
