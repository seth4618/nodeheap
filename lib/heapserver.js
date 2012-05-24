// commands:
// compare	compare base profile to current one
// setbase	make current profile the base profile
// info type name	get info on type/name.  If either is *, do for all
// chain id			get retainer chain for object id
// val id			get value of id

var util = require('util');

/** @type {function (new:TCPServer, !string, number):?} */
var TCPServer = require('simpletcp').server();

/** @type {function (new:JSONConnection, !TCPServer, !SocketConnection):?} */
var JSONConnection = require('simpletcp').JSONConnection();
//process.stderr.write('-----\n');
//process.stderr.write(util.inspect(TCPServer, true, 2));
//process.stderr.write('-----\n');
//process.stderr.write(util.inspect(JSONConnection, true, 2));
//process.stderr.write('-----\n');

var verbose = false;
var debug = false;

/**
 * HeapConnection
 * A class which filters words recieved on a connection
 *
 * @constructor
 * @extends {JSONConnection}
 *
 * @param {!TCPServer} server
 * @param {!SocketConnection} socket
 *
 **/
function HeapConnection(server, socket) 
{
    HeapConnection.super_.call(this, server, socket);
    var me = this;
    this.on('data', function(obj) { me.onJSONReceived(obj); });
    this.on('malformed', function(str) { me.onMalFormedInput(str); });
}
util.inherits(HeapConnection, JSONConnection);

/** @type {!Object.<string,function(Object.<string,string>)>} */ HeapConnection.commands = {};

/** @type {V8Profile} */ HeapConnection.prototype.base;
/** @type {V8Profile} */ HeapConnection.prototype.last;

/**
 * start
 * we just got a connection, set it up and tell client that is so
 *
 **/
HeapConnection.prototype.start = function()
{
    if (verbose) Util.info('started a heapconnection');
    this.write({status:0});
};

HeapConnection.prototype.onMalFormedInput = function(str)
{
    if (verbose) Util.info('malformed input from '+this.remote+': ['+str+']');
    this.write({status:1});
};

/**
 * onJSONReceived
 * filter the string and return the result
 *
 * @private
 * @param {!Object} obj
 **/
HeapConnection.prototype.onJSONReceived = function(obj)
{
    if (debug) console.log(obj);
    // must be a command
    try {
        var command = obj['command'];
        if (command in HeapConnection.commands) {
            var func = HeapConnection.commands[command];
            func.call(this, obj);
        }
    } catch (e) {
        if (verbose) Util.error(e);
        this.write({status:1});
    }
};

/**
 * respond
 * respond to a request.  Fill in status of 0 and original command, then write it back to user
 *
 * @private
 * @param {!Object} req
 * @param {!Object} resp
 **/
HeapConnection.prototype.respond = function(req, resp)
{
    resp.status = 0;
    resp.command = req.command;
    this.write(resp);
};

/**
 * errorRespond
 * respond to a request with an error.  Fill in status of 1 and original command, then write it back to user
 *
 * @private
 * @param {!Object} req
 * @param {!Object} resp
 **/
HeapConnection.prototype.errorRespond = function(req, resp)
{
    resp.status = 1;
    resp.command = req.command;
    this.write(resp);
};

//////////////// processing for commands

/**
 * commandCompare
 * compare two snapshots
 *
 * @private
 * @param {Object.<!string, !string>} obj
 **/
HeapConnection.prototype.commandCompare = function(obj)
{
    var showstrings = false;
    var showzeros = false;

    if ('strings' in obj) showstrings = obj.strings;
    if ('all' in obj) showzeros = obj.all;

    try {
	    var now = profiler.heapshot();
    } catch (err) {
        this.errorRespond(obj, {msg: 'getting heapshot failed.  Proper v8 installed?'});
        return;
    }
    this.last = now;
    if (this.base == undefined) {
        this.base = this.last;
        this.respond(obj, {msg: "No previous base, has been set to current state"});
        return;
    }
	var diff = this.base.showChange(now, showstrings);
	var sdiff = [];
	for (var key in diff) {
	    if ((diff[key] != 0)||showzeros) {
			var dash = key.indexOf('-');
			var type = key.substr(0, dash);
			var name = key.substr(dash+1);
			if (name.length > 32) {
				var len = name.length;
				name = name.substr(0, 32)+"..."+len;
			}
			sdiff.push({type: type, name: name, val: diff[key]});
		}
	}
	diff = null;
	sdiff = sdiff.sort(function (a, b) { return b.val - a.val; });
	if (debug) console.log(sdiff);
    this.respond(obj, {data:sdiff});
	sdiff = null;
};

/**
 * commandSetbase
 * set last snapshot to base snapshot.  If none defined, get it now
 *
 * @private
 * @param {Object.<string, string>} obj
 **/
HeapConnection.prototype.commandSetbase = function(obj)
{
    try {
        if (this.last == undefined) {
            this.base = profiler.heapshot();
        } else {
            this.base = this.last;
        }
        this.respond(obj, {});
    } catch (err) {
        // hmmm, 
        this.errorRespond(obj, {msg: 'getting heapshot failed.  Proper v8 installed?'});
    }
};

/**
 * commandInfo
 * get info on a type/name pair
 *
 * @private
 * @param {Object.<string, string>} obj
 **/
HeapConnection.prototype.commandInfo = function(obj)
{
    if (this.base == undefined) {
        this.errorRespond(obj, {msg: 'no profiler set, use "base" command'});
        return;
    }

	var type = obj.type;
	var name = obj.name;
	var info = this.base.getByTypeAndName(type, name);
    if (debug) console.log(info);
	this.respond(obj, {data: info});
};

/**
 * commandChain
 * get retainer chain for id
 *
 * @private
 * @param {Object.<string, string>} obj
 **/
HeapConnection.prototype.commandChain = function(obj)
{
	var id = parseInt(obj.id, 10);
	var info = this.base.getRetainerChain(id, 0);
	if (debug) console.log(info);
	this.respond(obj, {data: info});
};

/**
 * commandValue
 * get value of id
 *
 * @private
 * @param {Object.<string, string>} obj
 **/
HeapConnection.prototype.commandValue = function(obj)
{
    var id = parseInt(obj.id, 10);
    var hidden = obj.hidden || false;
    var depth = obj.depth || 2;
    var node = this.base.getNodeById(id);
    //Util.info('showing value of '+id+':'+node.name+':'+node.type+':'+node.size+' ret:'+node.retainersCount);
    var info = {name: node.name, type: node.type, size: node.size, rets: node.retainersCount};
    var val = node.getHeapValueSafe();
    var str = '';
    //console.log(val);
    if (val != undefined) {
        str = '' + val;
        if ((node.name == 'Error')&&(node.type == 'Object')) {
            str = '\n'+val.stack;
        }
    }
    var result = {info: info, string: str};
    if ('path' in obj) {
        // user wants a part of this object
        var path = obj.path.split('.');
        var i;
        var len = path.length;
        for (i=0; i<len; i++) {
            if (path[i] in val) val = val[path[i]];
            else break;
        }
        if (i <= len) {
            // we only got part way
            result.path = path.splice(0, i).join('.');
        }
    }
    result.value = util.inspect(val, hidden, depth);
    this.respond(obj, result);
};

HeapConnection.commands['comp'] = HeapConnection.prototype.commandCompare;
HeapConnection.commands['base'] = HeapConnection.prototype.commandSetbase;
HeapConnection.commands['info'] = HeapConnection.prototype.commandInfo;
HeapConnection.commands['chain'] = HeapConnection.prototype.commandChain;
HeapConnection.commands['v'] = HeapConnection.prototype.commandValue;

/**
 * start
 *
 * A heap probing server over a tcp socket
 *
 * @param {number} port
 * @param {boolean=} beverbose
 *
 **/
function start(port, beverbose)
{
    verbose = beverbose || false;

    try {
        profiler = (/** @type {!V8Profiler} */ require('v8-profiler'));
    } catch(e) {
        Util.error(e);
        Util.error('tried to execute require("v8-profiler"); but failed. is the profiler installed?');
        return;
    }

    var server = new TCPServer('test', port, HeapConnection);
    server.on('listen', function() {  if (verbose) Util.info("Heap Profiling started on port:"+port); });
    server.on('connection', function(conn) { conn.start(); });
    server.on('error', function(err) { console.log('Trying to start server Got error: '+err); server.destroy(); });
    server.setVerbose(verbose||debug);
    server.start();
}

var Util = {};
Util.info = function(x) { console.log(x) };
Util.error = function(x) { console.log('Error: '+x); }

module.exports = start;

// Local Variables:
// tab-width: 4
// indent-tabs-mode: nil
// End:

