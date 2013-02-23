

var shutil = exports;

shutil.wrapper = function(cmd, session, data)
{
	if (typeof(data) == 'undefined') {
		data = null;
	}

	var wrapper = new Object();
	wrapper.cmd = cmd;
	wrapper.session = session;
	wrapper.ts = new Date().getTime();
	wrapper.error = 1;			// default to error, function must clear
	wrapper.info = '';
	wrapper.data = data;
	
	return wrapper;
}