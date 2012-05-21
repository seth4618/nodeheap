// Copyright (c) 2012, flashgroup, Inc.
//#copyright
//#process: jsc.sh --option "--create_name_map_files true --formatting PRETTY_PRINT" 
//#keep out-heapcmd.js read-only

//#externfile externs/nodejs.js
//#externfile externs/tcpclient.js

var util=require('util');
var stdin=process.stdin;
var serverhost = "localhost";
var serverport = 8777;
var TCPClient = (/** @type {function (new:TCPClient, string, string, number, (function (): ?|undefined)): ?} */require('../../simpletcp').client());
var verbose = false;
var testme = 0;

////////////////////////////////////////////////////////////////
// utility functions

/**
 * $assert
 *
 * @param {*} x					assertion to evalute. if true, do nothing
 * @param {!string=} msg		msg to output if x is false
 */
function $assert(x, msg) {
    if (!!x) return;
    msg = msg ? msg : 'failed assert with no message';
    msg = 'FAILED ASSERT: ' + msg;
    Util.error(msg);
	throw new Error('Assertion fails: '+msg);
}

var Util = {};
Util.info = function(x) { if (HeapClient.verbosity) console.log(x) };
var Net = require('net');
Util.error = function(x) { console.log('Error: '+x); };

var promptstatus = "\nnotlogged in> ";
function output(str, prompt) {
    process.stdout.write(str);
    if (prompt) {
        process.stdout.write(promptstatus);
    }
}

////////////////////////////////////////////////////////////////
// main driver for processing user commands and talking to application

function HeapClient() {}
/** @type {!TCPClient} */ HeapClient.connection;
/** @type {boolean} */ HeapClient.enabled = false;
/** @type {number} */ HeapClient.waitingId = 0;
/** @type {boolean} */ HeapClient.verbosity = true;

HeapClient.init = function() {
    var client = new TCPClient('hc', 
                               serverhost,
                               serverport,
                               HeapClient.onConnection);
    HeapClient.client = client;

    client.on('data', HeapClient.executeResponse);
    client.on('end', HeapClient.serverDisabled);
    client.on('error', HeapClient.serverError);
    HeapClient.verbosity = verbose;
    client.open();
};

HeapClient.onConnection = function()
{
    if (HeapClient.verbosity) console.log("Trying to login to heap server");
    HeapClient.enabled = true;
    promptstatus = "\n> ";
};


HeapClient.serverError = function(err)
{
    if (err.code == 'ECONNREFUSED') {
        output(serverhost+":"+serverport+" refuses a connection.  Did you require('heapserver') and start it?", true);
    } else {
        console.log('we got an error from '+serverhost+":"+serverport+" - "+err, true);
    }
};

HeapClient.executeResponse = function(str)
{
    if (HeapClient.waitingId != 0) {
        clearTimeout(HeapClient.waitingId);
        HeapClient.waitingId = 0;
    }

    if (str.indexOf('{') != 0) {
        if (HeapClient.verbosity) console.log('malformed input: ['+str+']');
        return;
    }
    if (HeapClient.verbosity) console.log("server responds with:"+str);
    try {
        var obj = JSON.parse(str);
        if (obj.command in HeapClient.responseProcessors) {
            HeapClient.responseProcessors[obj.command](obj);
        } else {
            console.log(obj);
        }
    } catch (err) {
        Util.error("Error processing a response: "+str);
        throw err;
    }
};

HeapClient.responseWaiting = function()
{
    HeapClient.waitingCount++;
    HeapClient.waitingId = setTimeout(HeapClient.responseWaiting, 1000);
    console.log('still waiting for response:'+HeapClient.waitingCount);
};

HeapClient.makeRequest = function(data)
{
    HeapClient.client.writeJSON(data);
    HeapClient.waitingCount = 0;
    HeapClient.waitingId = setTimeout(HeapClient.responseWaiting, 1000);
    
};

/**
 * serverDisabled
 * called after the server is ended
 *
 **/
HeapClient.serverDisabled = function()
{
    console.log('connection is now disabled');
    HeapClient.enabled = false;
    delete HeapClient.connection;
};

HeapClient.login = function(str)
{
    if (HeapClient.enabled == true) console.log("Already enabled");
    else HeapClient.init();
};

HeapClient.quit = function(str)
{
    process.exit(0);
};

HeapClient.comp = function(str)
{
    var req = {command: 'comp', strings: false, all: false};
    if (str.match(/string/)) req.strings = true;
    if (str.match(/all/)) req.all = true;

    HeapClient.makeRequest(req);
};

HeapClient.base = function(str)
{
    HeapClient.makeRequest({command: 'base'});
};

HeapClient.info = function(str)
{
    var p = str.split(' ');
    if (p.length != 3) {
        console.log('error: info <type> <name> (type or name can be *)');
        return;
    }
    var req = {command: 'info', type: p[1], name: p[2]};
    
    HeapClient.makeRequest(req);

};

HeapClient.chain = function(str)
{
    var p = str.split(' ');
    if (p.length != 2) {
        console.log('error: chain <id>');
        return;
    }
    HeapClient.makeRequest({command: 'chain', id: p[1]});
};

HeapClient.value = function(str)
{
    var p = str.split(' ');
    if ((p.length < 2)||(p.length > 3)) {
        console.log('error: value <id> <depth>  (<depth> is optional)');
        return;
    } 
    var req = {command: 'v', id: p[1]};
    if (p.length == 3) req.depth = p[2];
    HeapClient.makeRequest(req);
};

HeapClient.inspect = function(str)
{
    var p = str.split(' ');
    if (p.length != 3) {
        console.log('error: value <id> <path>');
        return;
    } 
    var req = {command: 'v', id: p[1], path: p[2]};
    HeapClient.makeRequest(req);
};

HeapClient.verbose = function(str)
{
    var p = str.split(' ');
    var onoff = !HeapClient.verbosity;
    if (p.length == 2) {
        if (p[1] == "on") onoff = true;
        else if (p[1] == "off") onoff = false;
        else {
            output('error: verbose <on|off|>  if empty, toggles', true);
            return;
        }
    }
    HeapClient.verbosity = onoff;
    output('Verbosity is '+(onoff ? 'verbose' : 'quiet'), true);
};

HeapClient.help = function(str)
{
    for (var cmd in HeapClient.commands) {
        output(cmd+"\n");
    }
    output("", true);
};


HeapClient.commands = {};
HeapClient.commands['login'] = HeapClient.login;
HeapClient.commands['quit'] = HeapClient.quit;
HeapClient.commands['comp'] = HeapClient.comp;
HeapClient.commands['base'] = HeapClient.base;
HeapClient.commands['info'] = HeapClient.info;
HeapClient.commands['chain'] = HeapClient.chain;
HeapClient.commands['value'] = HeapClient.value;
HeapClient.commands['verbose'] = HeapClient.verbose;
HeapClient.commands['inspect'] = HeapClient.inspect;
HeapClient.commands['help'] = HeapClient.help;

//////////////// process responses

HeapClient.showValue = function(obj)
{
    output('Value of '+obj.info.type+':'+obj.info.name+' size:'+obj.info.size+' retainers:'+obj.info.rets+"\n");
    output('String: '+obj.string+"\n");
    if ('path' in obj) {
        output('Partial path upto: '+obj.path+"\n");
    }
    output('Value:'+"\n");
    var val = obj.value.replace(/\\n/g, '\n');
    val = val.replace(/\\\'/g, "'");
    output(val);
    output('-------------', true);
}

HeapClient.responseProcessors = {};
HeapClient.responseProcessors['v'] = HeapClient.showValue;

////////////////////////////////////////////////////////////////
// main entry point
////////////////////////////////////////////////////////////////

// process command line options

var argv = process.argv;
var i = 0;
var len = argv.length;
for (i=0; i<len; i++) {
	var arg = argv[i];
	if (arg.match(/.js$/)) {
		progname = arg;
		break;
	}
}
i++;
for (; i<len; i++) {
	arg = argv[i];
    if (arg == "--port") {
        // connect to the specified port
        serverport = parseInt(argv[i+1], 10);
        i++;
    } else if (arg == "--host") {
        // connect to the specified host
        serverhost = argv[i+1];
        i++;
    } else if (arg == "--test") {
        // test nodeheap on itself using port specified
        serverport = parseInt(argv[i+1], 10);
        serverhost = "localhost";
        testme = serverport;
        i++;
    } else if (arg == "--help") {
        output("heapcmd [--port <portnumber>] [--host <hostname>]\n");
        output("See http://github.com/seth4618/nodeheap for more info");
    } else {
        output("Unknown option "+arg+" try --help for more info");
    }
}

// start cmd loop


output('Welcome to the heap probe utility.\n');
output('Will probe application running on '+serverhost+":"+serverport+"\n");
output('\nuse "login" command when you are ready to connect to the application', true);

// handle input from stdin
stdin.resume(); // see http://nodejs.org/docs/v0.4.7/api/process.html#process.stdin
stdin.on('data',function(chunk){ // called on each line of input
    var line=chunk.toString().replace(/[\r\n]/,'');
    //console.log('stdin:received line:'+line);
    line = line.replace(/ +/g, ' ');
    var first = line.match(/^[^ ]+/);
    if (first in HeapClient.commands) {
        var func = HeapClient[first];
        func(line);
    } else {
        console.log('Unknown command "'+line+'"');
    }
}).on('end',function(){ // called when stdin closes (via ^D)
    console.log('stdin:closed');
});

if (testme != 0) {
    HeapServer = (/** @type {function (number, boolean=):?} */require('./heapserver.js'));
    HeapServer(testme);
}

// Local Variables:
// tab-width: 4
// indent-tabs-mode: nil
// End:

