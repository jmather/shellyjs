var WebSocketServer = require('ws').Server
var util = require('util');
var events = require('events');

var eventEmitter = new events.EventEmitter();

var shlog = require(global.gBaseDir + '/src/shlog.js');
var sh = require(global.gBaseDir + '/src/shutil.js');
var shUser = require(global.gBaseDir + '/src/shuser.js');
var shGame = require(global.gBaseDir + '/src/shgame.js');

gPort = 5102;

var live = exports;
var wss = null;

var gUsers = {};

live.notify = function(gameId, data) {
	shlog.info('notify game: gameId = ' + gameId);
	eventEmitter.emit(channel("game", gameId), data);
}

live.notifyUser = function(uid, data) {
	shlog.info('notify user: uid = ' + uid);
	eventEmitter.emit(channel("user", uid), data);
}

function channel(name, id)
{
	return "notify." + name + "." + id;
}

function sendWs(ws, error, data) {
	var msg = JSON.stringify(data);
	shlog.send(error, "live - %s", msg);
	ws.send(msg);
}

live.start = function() {
  wss = new WebSocketServer({port: gPort});
	shlog.info("websocket listening: " + gPort)

	wss.on('connection', function(ws) {
		shlog.info("socket: connect");
		var wsUid = 0;
		var wsGames = [];
	
	  ws.on('message', function(message) {
			shlog.recv("live - %s", message);
			
			var req = {};
			var res = {};
			
			// fill in req.params
			req.params = JSON.parse(message);
			
			// fill in req.session
			sh.fillSession(req, res, function(error, data) {
				if(error != 0) {
					sendWs(ws, error, data);
					return;
				}
				
				// valid user
				wsUid = req.session.uid;
				gUsers[wsUid] = {status: "online"};

				if(req.params.cmd == "live.user") {
					// hook them into user events
					var userChannel = channel("user", req.session.uid);
					if(eventEmitter.listeners(userChannel).indexOf(socketNotify) == -1) {
						shlog.info("add user channel: "+userChannel);
						eventEmitter.on(userChannel, socketNotify);
					}
					ws.send(JSON.stringify(sh.event("event.live.user", {status: "on", uid: wsUid})));
					return;
				}
				if(req.params.cmd == "live.game")
				{
					// hook them into game events
					// SWD validate params: gameId, status
					var gameId = req.params.gameId;
					var gameChannel = channel("game", gameId);
					
					if(req.params.status == "on")
					{
						if(eventEmitter.listeners(gameChannel).indexOf(socketNotify) == -1)
						{
							shlog.info("add game channel: "+gameChannel);
							global.live.notify(gameId, sh.event('event.game.user.online', {uid: wsUid}));
							wsGames.push(gameId);
							eventEmitter.on(gameChannel, socketNotify);
							
							// must send myself notifs for games existing online users
							var game = new shGame();
							game.load(gameId, function (error, data) {
								var players = game.get("players");
								for (uid in players) {
									if(uid != wsUid && typeof(gUsers[uid]) != "undefined") {
										ws.send(JSON.stringify(sh.event('event.game.user.online', {uid: uid})));
									}
								}
							});
						}
					} else {
						shlog.info("remove game channel:" + gameChannel);
						eventEmitter.removeListener(gameChannel, socketNotify);
						global.live.notify(gameId, sh.event('event.game.user.offline', {uid: wsUid}));
					}
					ws.send(JSON.stringify(sh.event("event.live.game", {status: req.params.status, game : gameId})));
					return;
				}

				sh.call(req.params.cmd, req, res, function(error, data) {
					shlog.info("back from call: " + req.params.cmd);
					var cmd = req.params.cmd;
					if(error == 0) {
						if(cmd == 'game.leave') {
							// SWD not sure we want to do this
								var gameChannel = channel("game", req.params.gameId);
								shlog.info("remove channel: "+gameChannel);
								var idx = wsGames.indexOf(req.params.gameId);
								if(idx != -1) {
									wsGames.splice(idx, 1);
								}
								eventEmitter.removeListener(gameChannel, socketNotify);
							}
						}
						sendWs(ws, error, data);
						return;
				});  // end sh.call
			});  // end sh.fillSession
		});  // end ws.on-message
		
		ws.on('error', function(err) {
			shlog.info(err);
		})
			
		ws.on('close', function(ws) {
			shlog.info("socket: close");
			
			delete gUsers[wsUid];
			
			var userChannel = channel("user", wsUid);
			shlog.info("socket: close cleanup - " + userChannel)
			eventEmitter.removeAllListeners(userChannel, socketNotify);
			for(var i=0; i<wsGames.length; i++) {
				var gameChannel = channel("game", wsGames[i]);
				shlog.info("socket: close cleanup - " + gameChannel)
				eventEmitter.removeListener(gameChannel, socketNotify);
				// since game is still in wsGames - user did not "game.leave" - SWD: we could enum the game.players like on set
				global.live.notify(wsGames[i], sh.event('event.game.user.offline', {uid: wsUid}));
			}
		});

		// helper functions in valid ws scope		
		var socketNotify = function(message) {
			shlog.info("socket: socketNotify")
			if(ws.readyState == 1) {
				// 1 = OPEN - SWD: find this in ws module later
				ws.send(JSON.stringify(message));
			} else {
				shlog.info("socket: dead socket");
			}
		};

	}); // end wss.on-connection
	
	wss.on('error', function(err) {
		shlog.info(err);
	});
}
