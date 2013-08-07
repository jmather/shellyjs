
exports._x = function (cb, func) {

  var ret = function (arg) {
    try {
      func.apply(null, arguments);
    } catch (e) {
      var lcb = cb;
      lcb(100, {message: e.toString(), stack: e.stack});
    }
  };
  return ret;
};

// Setup lean stack traces for V8
// hiding: omit leah2.js and the core node js files
// prettyMeta: the third argument for JSON.stringify(), e.g. '\t'
// frameSeparator: what to separate the stack entries with, default: ' < ' (use '\n' for Express)
// fiberSeparator: what to separate the (max 2) fibers with, default: ' << ' (use '\n<<\n' for Express)

exports.leanStacks = function(hiding, prettyMeta, frameSeparator, fiberSeparator) {

    Error.prepareStackTrace = function(e, s) {
        var stack = [];
        var cwd = new RegExp(process.cwd().replace(/[.^|$*?\[\]\\{}:!\/+()]/g, '\\$&'));
        var prev;
        var fs = frameSeparator || ' < ';

        for(var i = 0; i < s.length; i++) {
            var f = s[i];
            var n = (f.getFileName() || '?').replace(cwd, '.').replace(/node_modules/g, '$');
            var c = n.charAt(0);
            if(hiding && ((c !== '.' && c !== '/') || /.*?laeh2.js$/.exec(n)))
                continue;
            var ln = (f.getLineNumber() || '?') + (f.isEval() ? '*' : '') + (f.isNative() ? '+' : '');
            if(prev == n)
                stack[stack.length - 1] += ' < ' + ln;
            else
                stack.push(n + '(' + ln);
            prev = n;
        }
        for(var i = 0; i < stack.length; i++)
            stack[i] += ')'

        var msg = '';

        if(e.message)
            msg += e.message + fs;
        if(e.meta)
            msg += (typeof(e.meta) === 'object' ?
                JSON.stringify(e.meta, null, prettyMeta) : String(e.meta)) + ' ';
        msg += stack.join(fs);

        if(e.prev)
            msg += (fiberSeparator || ' << ') + (e.prev.stack || e.prev);

        return msg;
    };

    return exports;
};