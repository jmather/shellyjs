var util = require('util'),    
    http = require('http');
		
var winston = require('winston');

var reqTest = {"cmd":"reg", "data":"pong"};

http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'});
//  res.write('hello, your kung foo is strong. Yes strong - hit me')
	var cmdFile = '../functions/'+reqTest['cmd']+'.js'
	delete require.cache[require.resolve(cmdFile)]
	testData = require(cmdFile).login(req);
  res.write(JSON.stringify(testData));
  res.end();
}).listen(5101);

/* server started */  
util.puts('> hello world running on port 8000');