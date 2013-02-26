var WebSocketServer = require('ws').Server
var events = require('events');

var eventEmitter = new events.EventEmitter();

var shutil = require(global.gBaseDir + '/src/shutil.js');
var shUser = require(global.gBaseDir + '/src/shuser.js');

gPort = 5102;

var live = exports;
var wss = null;

live.notify = function(gameId, data) {
	console.log('notify game: gameId = ' + gameId);
	eventEmitter.emit("notify.game."+gameId, data);
}

live.notifyUser = function(uid, data) {
	console.log('notify user: uid = ' + uid);
	eventEmitter.emit("notify.user."+uid, data);
}

live.start = function() {
  wss = new WebSocketServer({port: gPort});
	console.log("websocket listening: " + gPort)

	wss.on('connection', function(ws) {
		console.log("socket: connect")
	
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
				// valid user - hook them into events
				// this will eventually move to a live.init command, but for now check listener array
				var userChannel = "notify.user." + req.session.uid;
				if(eventEmitter.listeners(userChannel).indexOf(socketNotify) == -1) {
					eventEmitter.on("notify.user."+req.session.uid, socketNotify);
				}

				shutil.call(req.params.cmd, req, res, function(error, data) {
					console.log("back from call: " + req.params.cmd);
					var cmd = req.params.cmd;
					if(cmd == 'game.join' || cmd == 'gqueue.nextAvailable') {
						if(error == 0) {
							// let them listen for events, if joined, nextAvailable forwards to game.join
							// allow for rejoins to come in by checking listener array
							var gameChannel = "notify.game."+req.params.gameId;
							if(eventEmitter.listeners(gameChannel).indexOf(socketNotify) == -1) {
								eventEmitter.on("notify.game."+req.params.gameId, socketNotify);
							}
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
			
		ws.on('close', function(ws) {
			console.log("socket: close")
			eventEmitter.removeListener("someOccurence", socketNotify);
		});

		// helper functions in valid ws scope		
		var socketNotify = function(message) {
			console.log("socket: socketNotify")
			if(ws.readyState == 1) {
				// 1 = OPEN - SWD: find this in ws module later
				ws.send(JSON.stringify(message));
			} else {
				console.log("socket: dead socket");
			}
		};

	});
	
	wss.on('error', function(err) {
		console.log(err);
	});
}
