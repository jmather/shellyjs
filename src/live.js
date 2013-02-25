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
//				var wrapper = shutil.wrapper("game.turn", 0, 1, "bad session");
				var event = shutil.event("event.error", {info: 'bad session token'});
				ws.send(JSON.stringify(event));
				return
			}
			req.session = {};
			req.session.uid = req.params.session.split(':')[1];
			console.log("loading user: uid = " + req.session.uid);
			var user = new shUser();
			user.loadOrCreate(req.session.uid, function(error, data) {
				if(error != 0) {
//					var wrapper = shutil.wrapper(req.params.cmd, req.params.session, error, {info: "unable to load user: " + req.session.uid});
					var event = shutil.event("event.error", {info: "unable to load user: " + req.session.uid});
					ws.send(JSON.stringify(event));	
					return;
				}
				console.log("user loaded: " + req.session.uid);
				req.session.user = user;
			
				shutil.call(req.params.cmd, req, res, function(error, data) {
					var cmd = req.params.cmd;
					if(cmd == 'game.join' || cmd == 'gqueue.nextAvailable') {
						if(error == 0) {
							// let them listen for events, if join or or already playing(106)
							var channel = "notify-" + req.params.gameId;
							console.log("socket: on channel=" + channel);
							eventEmitter.on(channel, socketNotify);					
						}
//						var wrapper = shutil.wrapper(req.params.cmd, req.params.session, error, data);
						ws.send(JSON.stringify(data));
						return;
					}
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
//				var wrapper = shutil.wrapper("game.turn", 0, 0, message);
//				ws.send(JSON.stringify(wrapper));
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
