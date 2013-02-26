var WebSocketServer = require('ws').Server
var util = require('util');
var events = require('events');

var eventEmitter = new events.EventEmitter();

var shutil = require(global.gBaseDir + '/src/shutil.js');
var shUser = require(global.gBaseDir + '/src/shuser.js');

gPort = 5102;

var live = exports;
var wss = null;

live.notify = function(gameId, data) {
	console.log('notify game: gameId = ' + gameId);
	eventEmitter.emit(channel("game", gameId), data);
}

live.notifyUser = function(uid, data) {
	console.log('notify user: uid = ' + uid);
	eventEmitter.emit(channel("user", uid), data);
}

function channel(name, id)
{
	return "notify." + name + "." + id;
}

live.start = function() {
  wss = new WebSocketServer({port: gPort});
	console.log("websocket listening: " + gPort)

	wss.on('connection', function(ws) {
		console.log("socket: connect")
		var wsUid = 0;
		var wsGames = [];
	
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
				// this will eventually move to a live.init command, but for now check listener array
				// SWD - don't change users on a socket - or we lose ability to remove the listener
				// used to clean up user listener
				wsUid = req.session.uid;				
				// valid user - hook them into events
				var userChannel = channel("user", req.session.uid);
				if(eventEmitter.listeners(userChannel).indexOf(socketNotify) == -1) {
					eventEmitter.on(userChannel, socketNotify);
				}

				shutil.call(req.params.cmd, req, res, function(error, data) {
					console.log("back from call: " + req.params.cmd);
					var cmd = req.params.cmd;
					if(cmd == 'game.join' || cmd == 'gqueue.nextAvailable') {
						if(error == 0) {
							// let them listen for events, if joined, nextAvailable forwards to game.join
							// allow for rejoins to come in by checking listener array
							var gameChannel = channel("game", req.params.gameId);
							if(eventEmitter.listeners(gameChannel).indexOf(socketNotify) == -1) {
								console.log("add channel: "+gameChannel);
								wsGames.push(req.params.gameId);
								eventEmitter.on(gameChannel, socketNotify);
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
			var userChannel = channel("user", wsUid);
			console.log("socket: close cleanup - " + userChannel)
			eventEmitter.removeAllListeners(userChannel, socketNotify);
			for(var i=0; i<wsGames.length; i++) {
				var gameChannel = channel("game", wsGames[i]);
				console.log("socket: close cleanup - " + gameChannel)
				eventEmitter.removeAllListeners(gameChannel, socketNotify);
			}
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
