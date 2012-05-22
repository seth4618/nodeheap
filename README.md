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
specify a port and nodeheap will run on itself.  For example:

nodeheap --test 8877
