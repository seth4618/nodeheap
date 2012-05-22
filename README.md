nodeheap
========

CLI for inspecting the heap of a node application

## Installation

    npm install https://github.com/seth4618/nodeheap

## Usage

The program undertest needs to run a tcpserver which you get from:

    var heapserver = require('heapserver.js');	// include basic code
    heapserver(port);				// start heapserver on port 'port'

For example, in my code I define a runtime argument profileMemOn and profilePort and do the following:

    if (profileMemOn) {
        HeapServer = (/** @type {function (number, boolean=):?} */require('nodeheap'));
        HeapServer(profilePort);
    }

Then to see what is going on run the command: 

    nodeheap --port <port>

on the command line will connect to the program undertest.  The following commands are available:

- *login*: gets things started
- *quit*:  will exit
- *help*:  print a set of commands

- *base*:  Will set the base profile to the last profile used. Or, if none has been used will create a profile.
- *comp*:  Will compare the current heap profile with whatever was set as the base profile.
- *info* \<type\> \<name\>: show information on all objects of type 'type'
   	  with name 'name'.  A '*' in either will include everything.
   	  I.e., info Object * will show all objects, while info Object
   	  Foo will only show those objects with the name Foo.
- *chain* \<id\>: will show the retainer chain for object with id, \<id\>.
- *value* \<id\> \<depth\> \<hidden\>: will show the value of object with id \<id\> to a depth of \<depth\>.  \<depth\> is optional, if not supplied will do \<depth\> = 2.  If 'hidden' is specified will also include hidden members.
- *inspect* \<id\> \<path\>: will show the value of the object \<id\>.\<path\>

## Example

You can test things out by running nodeheap with the --test switch,
specify a port and nodeheap will run on itself.  For example, here is a sample session:

```sh
> nodeheap --test 8877
Welcome to the heap probe utility.
You are testing nodeheap on itself!
Will probe application running on localhost:8877

use "login" command when you are ready to connect to the application
    	    #
	    # enter the 'login' command to connect to the application
	    #
notlogged in> login

    	    #
	    # enter the 'base' command to get a snapshot you can refer to
	    #
> base

    	    #
	    # ask for info on all things that are of type 'Object' with name 'HeapConnection'
	    #
> info Object HeapConnection
{ data: 
   [ { name: 'HeapConnection',
       type: 'Object',
       size: 24,
    	    #
	    # the id listed here can be used to get the actual value of this object
	    #
       id: 241,
       retainers: [Object] },
     { name: 'HeapConnection',
       type: 'Object',
       size: 104,
       id: 25891,
       retainers: [Object] } ],
  command: 'info' }
    	    #
	    # show the value of the last of the objects shown above to depth 1, no hidden fields
	    #
> value 25891 1
showing value of 25891:HeapConnection:Object:104 ret:17
Value of Object:HeapConnection size:104 retainers:17
String: [object Object]
Value:
{ server: 
   { name: 'test',
     port: 8877,
     verbose: false,
     connClass: [Object],
     _events: [Object],
     server: [Object] },
  socket: 
   { _handle: [Object],
     _pendingWriteReqs: 0,
     _flags: 0,
     _connectQueueSize: 0,
     destroyed: false,
     errorEmitted: false,
     bytesRead: 80,
     bytesWritten: 805,
     allowHalfOpen: false,
     writable: true,
     readable: true,
     server: [Object],
     _events: [Object] },
  buffer: '',
  verbose: false,
  _events: { data: [Function], malformed: [Function], connect: [Function] },
  base: 
   { type: 'Full',
     root: [Object],
     nodesCount: 15697,
     uid: 1,
     title: 'org.nodejs.profiles.heap.user-initiated.1',
     getNodeById: [Function: getNodeById],
     getNode: [Function: getNode],
     delete: [Function: delete],
     serialize: [Function: serialize] } }
-------------
    	    #
	    # inspect the 'base' field of the above object
	    #
> inspect 25891 base
showing value of 25891:HeapConnection:Object:104 ret:17
Value of Object:HeapConnection size:104 retainers:17
String: [object Object]
Partial path upto: base
Value:
{ type: 'Full',
  root: 
   { size: 0,
     name: '',
     id: 1,
     ptr: 1965359232,
     dominatorNode: 
      { size: 0,
        name: '',
        id: 1,
        ptr: 1965359232,
        dominatorNode: [Object],
        type: 'Object',
        retainersCount: 0,
        childrenCount: 2,
        getChild: [Function: getChild],
        retainedSize: [Function: retainedSize],
        getRetainer: [Function: getRetainer],
        getHeapValue: [Function: getHeapValue],
        getHeapValueSafe: [Function: getHeapValueSafe] },
     type: 'Object',
     retainersCount: 0,
     childrenCount: 2,
     getChild: [Function: getChild],
     retainedSize: [Function: retainedSize],
     getRetainer: [Function: getRetainer],
     getHeapValue: [Function: getHeapValue],
     getHeapValueSafe: [Function: getHeapValueSafe] },
  nodesCount: 15697,
  uid: 1,
  title: 'org.nodejs.profiles.heap.user-initiated.1',
  getNodeById: [Function: getNodeById],
  getNode: [Function: getNode],
  delete: [Function: delete],
  serialize: [Function: serialize] }-------------
    	    #
	    # inspect the 'object.base.title' 
	    #
> inspect 25891 base.title
showing value of 25891:HeapConnection:Object:104 ret:17
Value of Object:HeapConnection size:104 retainers:17
String: [object Object]
Partial path upto: base.title
Value:
'org.nodejs.profiles.heap.user-initiated.1'-------------
    	    #
	    # compare the heap now to the snapshot set when we executed the 'base' command
	    # each line shows the change in the number of type/name objects in the heap.  That is, 
	    # There are 68 more Array's with the name '(map descriptor content)' and
	    # 1 fewer object of type 'Code' with the name: 'symToFamily'.
	    #
> comp
{ data: 
   [ { type: 'Array', name: '(map descriptor content)', val: 68 },
     { type: 'Hidden', name: 'system / Map', val: 62 },
     { type: 'Array', name: '(map descriptors)', val: 53 },
     { type: 'Hidden', name: 'system / Foreign', val: 43 },
     { type: 'Array', name: '', val: 26 },
     { type: 'Object', name: 'Object', val: 19 },
     { type: 'Array', name: '(code deopt data)', val: 17 },
     { type: 'Hidden', name: 'system / AccessorInfo', val: 17 },
     { type: 'Hidden',
       name: 'system / FunctionTemplateInfo',
       val: 12 },
     { type: 'Array', name: '(object elements)', val: 9 },
     { type: 'Hidden', name: 'system / CallHandlerInfo', val: 9 },
     { type: 'Object', name: 'Array', val: 7 },
     { type: 'HeapNumber', name: 'number', val: 5 },
     { type: 'Hidden', name: 'system / ObjectTemplateInfo', val: 3 },
     { type: 'RegExp', name: '\'', val: 1 },
     { type: 'Object', name: 'getRetainer', val: 1 },
     { type: 'Closure', name: '', val: 1 },
     { type: 'Hidden', name: 'system / JSGlobalPropertyCell', val: 1 },
     { type: 'Object', name: 'getHeapValueSafe', val: 1 },
     { type: 'Code', name: 'retainedSize', val: 1 },
     { type: 'RegExp', name: '\\\\\\\'', val: 1 },
     { type: 'RegExp', name: '^"([a-zA-Z_][a-zA-Z_0-9]*)"$', val: 1 },
     { type: 'Closure', name: 'getChild', val: 1 },
     { type: 'RegExp', name: 'all', val: 1 },
     { type: 'Object', name: 'delete', val: 1 },
     { type: 'Closure', name: 'getNode', val: 1 },
     { type: 'Closure', name: 'getNodeById', val: 1 },
     { type: 'Object', name: 'getNodeById', val: 1 },
     { type: 'Object', name: 'getHeapValue', val: 1 },
     { type: 'Code', name: 'getChild', val: 1 },
     { type: 'Object', name: 'getChild', val: 1 },
     { type: 'Closure', name: 'retainedSize', val: 1 },
     { type: 'Object', name: 'getNode', val: 1 },
     { type: 'Closure', name: 'getHeapValue', val: 1 },
     { type: 'RegExp', name: '^\\d+$', val: 1 },
     { type: 'Code', name: 'getHeapValue', val: 1 },
     { type: 'Code', name: 'getNodeById', val: 1 },
     { type: 'Closure', name: 'delete', val: 1 },
     { type: 'Code', name: 'serialize', val: 1 },
     { type: 'RegExp', name: '\\\\n', val: 1 },
     { type: 'Closure', name: 'getRetainer', val: 1 },
     { type: 'Code', name: 'getRetainer', val: 1 },
     { type: 'RegExp', name: 'string', val: 1 },
     { type: 'RegExp', name: '^"|"$', val: 1 },
     { type: 'Code', name: 'getHeapValueSafe', val: 1 },
     { type: 'Code', name: 'delete', val: 1 },
     { type: 'RegExp', name: '[0-9]+', val: 1 },
     { type: 'Object', name: 'serialize', val: 1 },
     { type: 'Code', name: 'getNode', val: 1 },
     { type: 'Object', name: 'retainedSize', val: 1 },
     { type: 'Closure', name: 'serialize', val: 1 },
     { type: 'RegExp', name: '\\\\"', val: 1 },
     { type: 'Closure', name: 'getHeapValueSafe', val: 1 },
     { type: 'Code', name: 'familyToSym', val: -1 },
     { type: 'Code', name: 'realpathSync', val: -1 },
     { type: 'Code', name: 'trim', val: -1 },
     { type: 'Code', name: '$assert', val: -1 },
     { type: 'Object', name: 'Timer', val: -1 },
     { type: 'Code', name: 'symToFamily', val: -1 },
     { type: 'Object', name: 'Date', val: -1 },
     { type: 'Array', name: '(object properties)', val: -2 },
     { type: 'Code', name: 'f', val: -2 },
     { type: 'Array', name: '(code relocation info)', val: -26 },
     { type: 'Array', name: '(function scope info)', val: -29 },
     { type: '', name: 'String', val: -60 },
     { type: 'Code', name: '', val: -81 } ],
  command: 'comp' }
    	    #
	    # all done.  use the 'help' command for a list of commands.
	    #
> quit
```

