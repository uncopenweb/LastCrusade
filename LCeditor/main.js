/**************************************************************************
*
* TheLastCrusade editor -- developed for HarkTheSound.org by Robert Overman
*
***************************************************************************/

dojo.provide('main');
dojo.require('dojo.parser');
dojo.require('dojo.hash');
dojo.require('dojox.timing');
dojo.require('widgets.node');

dojo.declare('main', null, {
    constructor: function() {
        //TODO: allow user to set markers
        //TODO: save user from things like making too strong of an enemy
        //TODO: Have a node.js widget. Can istantiate as many as you like.
            //at the end convert each new node widget to a json that
            //will be used during gameplay
        //TODO: going to need cleanup after x # of deletions
        //TODO: unreachable nodes??

        //globals
        dojo.global.north = 0;
        dojo.global.south = 1;
        dojo.global.east = 2;
        dojo.global.west = 3;

        //state
        this.sOff = 0;
        this.sNavigate = 1;
        this.sNewNode = 2;
        this.sChooseDelete = 3;
        this.state = this.sOff;
        this.directions = dojo.byId("directions");

        //coord --> nodes
        //{x, y} -->nIndex
        this.x = 0;
        this.y = 0;
        this.cMap = new Array();
        this.cMap.push([{"x": 0, "y":0}, 0]);

        //garbage collection
        this.trash = 0;
        this.collectionTime = 3;

        this.nodes = new Array();
        this.keyDelay = 0;
        this.nextDir = -1;
        var data = {"nNorth":-1, "nSouth": -1, "nEast": -1, "nWest": -1, "nIndex": 0, "x": 0, "y":0 };
        this.startNode = new widgets.node({nodeData: data}, null);
        this.currentNode = this.startNode;
        this.nodes.push(this.startNode);
        
        //messages to display with corresponding state
        var stateHandle = dojo.subscribe("stateStatus", dojo.hitch(this, function(message){
            switch (message){
            case this.sOff:
                this.directions.innerHTML = "";
                break;
            case this.sNavigate:
                this.directions.innerHTML = "Up Arrow: Move North <br> Down Arrow: Move South <br> Right Arrow: Move East <br> Left Arrow: Move West <br> D: Delete A Node";
                break;
            case this.sNewNode:
                this.directions.innerHTML = "Y: Yes, create new node <br> N: No";
                break;
            case this.sChooseDelete:
                this.directions.innerHTML = "Use the arrow keys to choose a node to delete <br> Press escape to cancel";
                break;
            }
        })); 
        var def = uow.getAudio({defaultCaching: true});    //get JSonic
        def.then(dojo.hitch(this, function(audio) { 
            this._audio = audio;
            dojo.connect(dojo.global, 'onkeyup', dojo.hitch(this, '_removeKeyDownFlag'));
            dojo.connect(dojo.global, 'onkeydown', dojo.hitch(this, '_analyzeKey'));     
            this._keyHasGoneUp = true;
            this.setState(this.sNavigate);
        }));           
    },

    /*
        Remove key down flag. Checking key down flag prevents streaming 
        requests to server from holding down a key
    */
    _removeKeyDownFlag: function() {
        if (this.keyDelayTimer && this.keyDelayTimer.isRunning){} //do nothing
        else{
            this.keyDelayTimer = new dojox.timing.Timer(this.keyDelay*1000);
            this.keyDelayTimer.onTick = dojo.hitch(this, function() {
                this.keyDelayTimer.stop(); //prevent from running again.
                this._keyHasGoneUp = true;
            });
            this.keyDelayTimer.start();
        }
	},    

    /*
        Analyze user input given the state of the game
    */
    _analyzeKey: function(evt){
        console.log("Current state: ", this.state);
        if (this._keyHasGoneUp) {
            this._keyHasGoneUp = false;             
                switch(this.state){  
                    case this.sOff:
                        break;
                    case this.sNavigate:
                        switch(evt.keyCode){
                            case dojo.keys.DOWN_ARROW:
                                this.setState(this.sOff);
                                evt.preventDefault();
                                this._audio.stop({channel:'main'});
                                this.move(dojo.global.south);
                                break;
                            case dojo.keys.LEFT_ARROW:
                                this.setState(this.sOff);
                                evt.preventDefault();
                                this._audio.stop({channel:'main'});
                                this.move(dojo.global.west);
                                break;
                            case dojo.keys.RIGHT_ARROW:
                                this.setState(this.sOff);
                                evt.preventDefault();
                                this._audio.stop({channel:'main'});
                                this.move(dojo.global.east);
                                break;
                            case dojo.keys.UP_ARROW:
                                this.setState(this.sOff);
                                evt.preventDefault();
                                this._audio.stop({channel:'main'});
                                this.move(dojo.global.north);
                                break;
                            case 68: //delete node
                                this.setState(this.sOff);
                                evt.preventDefault();
                                this._audio.stop({channel:'main'});
                                this.chooseNodeToDelete();
                                break;
                        }
                        break;
                    case this.sNewNode:
                        switch(evt.keyCode){
                            case 89: //Y
                                this.setState(this.sOff);
                                this._audio.stop({channel:'main'});
                                this.buildNode(this.nextDir);
                                break;
                            case 78: //N
                                this._audio.stop({channel:'main'});
                                this.setState(this.sNavigate);
                                break;
                        }
                        break;
                    case this.sChooseDelete:
                        switch(evt.keyCode){
                            case dojo.keys.DOWN_ARROW:
                                this.setState(this.sOff);
                                evt.preventDefault();
                                if(this.currentNode.nSouth == -1){
                                    this._audio.say({text:"There is no node in this direction to delete", channel:'main'});
                                    this.setState(this.sNavigate);
                                }
                                else{
                                    this.deleteNode(dojo.global.south);
                                }
                                break;
                            case dojo.keys.LEFT_ARROW:
                                this.setState(this.sOff);
                                evt.preventDefault();
                                if(this.currentNode.nWest == -1){
                                    this._audio.say({text:"There is no node in this direction to delete", channel:'main'});
                                    this.setState(this.sNavigate);
                                }
                                else{
                                    this.deleteNode(dojo.global.west);
                                }
                                break;
                            case dojo.keys.RIGHT_ARROW:
                                this.setState(this.sOff);
                                evt.preventDefault();
                                if(this.currentNode.nEast == -1){
                                    this._audio.say({text:"There is no node in this direction to delete", channel:'main'});
                                    this.setState(this.sNavigate);
                                }
                                else{
                                    this.deleteNode(dojo.global.east);
                                }
                                break;
                            case dojo.keys.UP_ARROW:
                                this.setState(this.sOff);
                                evt.preventDefault();
                                if(this.currentNode.nNorth == -1){
                                    this._audio.say({text:"There is no node in this direction to delete", channel:'main'});
                                    this.setState(this.sNavigate);
                                }
                                else{
                                    this.deleteNode(dojo.global.north);
                                }
                                break;
                            case dojo.keys.ESCAPE:
                                this.setState(this.sNavigate);
                                break;
                        }
                        break;
                }
        }        
        else {
            if (evt.keyCode == dojo.keys.UP_ARROW || 
                evt.keyCode == dojo.keys.RIGHT_ARROW || 
                evt.keyCode == dojo.keys.LEFT_ARROW || 
                evt.keyCode == dojo.keys.DOWN_ARROW) 
            {
                evt.preventDefault();
            }
        }
    },

    chooseNodeToDelete: function(){
        this._audio.say({text: "Use the arrow keys to choose the node to delete or press escape to cancel.", channel:'main'});
        this.setState(this.sChooseDelete);
    },

    buildNode: function(direction){
        var x,y, north, south, east, west;
        switch (direction){
            case dojo.global.north:
                x = this.x;
                y = this.y + 1;         
                break;
            case dojo.global.south:
                x = this.x;
                y = this.y - 1;
                break;
            case dojo.global.east:
                x = this.x + 1;
                y = this.y; 
                break;
            case dojo.global.west:
                x = this.x - 1;
                y = this.y;
                break;
        }
        var nodes = this.nodesFromCoords(x, y);
        var data = {"nNorth": nodes[0],
            "nSouth": nodes[1], "nEast": nodes[2], "nWest": nodes[3],
            "nIndex": this.nodes.length, "x":x, "y":y};
        var newNode = new widgets.node({nodeData: data}, null);
        this.cMap.push([{"x": x, "y":y},this.nodes.length]);
        this.nodes.push(newNode);
        this.x = x;
        this.y = y;
        this.currentNode = this.nodes[this.nodes.length - 1];
        this.setState(this.sNavigate);
    },

    /*
     * Return the values pointing to the 4 nodes surrounding node at
     * passed in coords
     * */
    nodesFromCoords: function(x,y){
        var n = -1;
        var s = -1;
        var e = -1;
        var w = -1;

        dojo.forEach(this.cMap, dojo.hitch(this,function(entry){
            if(entry == null){ 
                //space of a deleted node
            }
            else{
                if((entry[0].x == x) && (entry[0].y == (y+1))){ //north
                    n = entry[1];
                    //update that node
                    this.nodes[n].nSouth = this.nodes.length;
                }
                if((entry[0].x == x) && (entry[0].y == (y-1))){ //south
                    s = entry[1];
                    //update that node
                    this.nodes[s].nNorth = this.nodes.length;
                }
                if((entry[0].x == (x + 1)) && (entry[0].y == y)){ //east
                    e = entry[1];
                    //update that node
                    this.nodes[e].nWest = this.nodes.length;
                }
                if((entry[0].x == (x - 1)) && (entry[0].y == y)){ //west
                    w = entry[1];
                    //update that node
                    this.nodes[w].nEast = this.nodes.length;
                }
            }
        }));
        return [n,s,e,w];
    },
    
    move: function(direction){
        //TODO: update x,y
        switch (direction){
            case dojo.global.north:
                if(this.currentNode.nNorth == -1){
                    this.questionNewNode(direction);
                }
                else{
                    this.y = this.y + 1;
                    this.currentNode = this.nodes[this.currentNode.nNorth];
                    this.setState(this.sNavigate);
                }
                break;
            case dojo.global.south:
                if(this.currentNode.nSouth == -1){
                    this.questionNewNode(direction);
                }
                else{
                    this.y = this.y - 1;
                    this.currentNode = this.nodes[this.currentNode.nSouth];
                    this.setState(this.sNavigate);
                }
                break;
            case dojo.global.east:
                if(this.currentNode.nEast == -1){
                    this.questionNewNode(direction);
                }
                else{
                    this.x = this.x + 1;
                    this.currentNode = this.nodes[this.currentNode.nEast];
                    this.setState(this.sNavigate);
                }
                break;
            case dojo.global.west:
                if(this.currentNode.nWest == -1){
                    this.questionNewNode(direction);
                }
                else{
                    this.x = this.x - 1;
                    this.currentNode = this.nodes[this.currentNode.nWest];
                    this.setState(this.sNavigate);
                }
                break;
        }
        console.log(this.currentNode);
    },

    questionNewNode: function(direction){
        var dir = "";
        switch (direction){
            case dojo.global.north:
                dir = "North";
                break;
            case dojo.global.south:
                dir = "South";
                break;
            case dojo.global.east:
                dir = "East";
                break;
            case dojo.global.west:
                dir = "West";
                break;
        }
        this.nextDir = direction;
        this._audio.say({text:"There is no node in this direction. Would you like to create a new node to the " + dir + " of your current location?", channel: 'main'});
        this.setState(this.sNewNode);
    },
    
    /*
        fade out and stop channel
    */
    fadeChannel: function(chn){
        //implement fading boolean        
        this.fading = true;
        var increments=[0.75, 0.5, 0.25, 0.1, 0.05];
        var i = 0;
        var fadeTimer = new dojox.timing.Timer(400);
        var deferred = new dojo.Deferred();
        fadeTimer.onTick = dojo.hitch(this, function() {
            this._audio.setProperty({name : 'volume', value: increments[i], channel : chn, immediate : true});
            if(i == (increments.length - 1))
            {
                fadeTimer.stop();
                this._audio.stop({channel : chn});
                this._audio.setProperty({name : 'volume', value: 1.0, channel : chn, immediate : true});
                deferred.callback();
            }
            i++;
        });
        fadeTimer.start();
        return deferred;
    },

    /*
        Sets this.state and also publishes to change on screen directions
    */
    setState:function(state){
        //console.log(arguments.callee.caller.toString(), "With state: " + this.state);
        this.state = state;
        dojo.publish("stateStatus", [state]);
    },

    deleteNode: function(direction){
        this.trash = this.trash + 1;
        var node = this.startNode;
        var index = -1;
        //find node to be removed
        switch (direction){
            case dojo.global.north:
                node = this.nodes[this.currentNode.nNorth];
                index = this.currentNode.nNorth;
                break;
            case dojo.global.south:
                node = this.nodes[this.currentNode.nSouth];
                index = this.currentNode.nSouth;
                break;
            case dojo.global.east:
                node = this.nodes[this.currentNode.nEast];
                index = this.currentNode.nEast;
                break;
            case dojo.global.west:
                node = this.nodes[this.currentNode.nWest];
                index = this.currentNode.nWest;
                break;
        }
        //remove all pointers to it
        if(node.nNorth != -1){
            this.nodes[node.nNorth].nSouth = -1;
        }
        if(node.nSouth != -1){
            this.nodes[node.nSouth].nNorth = -1;
        }
        if(node.nEast != -1){
            this.nodes[node.nEast].nWest = -1;
        }
        if(node.nWest != -1){
            this.nodes[node.nWest].nEast = -1;
        }
        //delete from coord lookup
        dojo.some(this.cMap, dojo.hitch(this,function(entry, idx){
            if(entry == null){ 
                //space of a deleted node
            }
            else if((entry[0].x == node.x) && (entry[0].y == node.y)){
                this.cMap[idx] = null;
                return false;
            }
        }));
        //mark empty spot in array
        this.nodes[index] = null;
        if(this.trash >= this.collectionTime){
            console.log("Cleaning up: ", this.nodes);
            this.cleanUp();
        }
        console.log("Nodes after deletion: ", this.nodes);
        this.setState(this.sNavigate);
    },

    cleanUp: function(){
        var temp = new Array();
        var sawANull = false;
        var currentIdx = this.currentNode.nIndex;
        var newCurrIdx = -1;
        dojo.forEach(this.nodes, dojo.hitch(this,function(node){
            if(node!=null && !sawANull){
                temp.push(dojo.clone(node));
            }
            else if(node == null){
                sawANull = true;
            }
            else if(node!=null){
                var idx = temp.length;

                if(node.nIndex == currentIdx){
                    newCurrIdx = idx;
                }
                node.nIndex = idx;
                //north
                if((node.nNorth!=-1) && (node.nNorth > idx)){ //data to change still in old arr
                    this.nodes[node.nNorth].nSouth = idx;
                }
                else if(node.nNorth!=-1){ //in new arr
                    temp[node.nNorth].nSouth = idx; 
                }
                //south
                if((node.nSouth!=-1) && (node.nSouth > idx)){ //data to change still in old arr
                    this.nodes[node.nSouth].nNorth = idx;
                }
                else if(node.nSouth!=-1){ //in new arr
                    temp[node.nSouth].nNorth = idx; 
                }
                //east
                if((node.nEast!=-1) && (node.nEast > idx)){ //data to change still in old arr
                    this.nodes[node.nEast].nWest = idx;
                }
                else if(node.nEast!=-1){ //in new arr
                    temp[node.nEast].nWest = idx; 
                }
                //west
                if((node.nWest!=-1) && (node.nWest > idx)){ //data to change still in old arr
                    this.nodes[node.nWest].nEast = idx;
                }
                else if(node.nWest!=-1){ //in new arr
                    temp[node.nWest].nEast = idx; 
                }
                temp.push(dojo.clone(node));
            }
            if(temp.length == 1){ //update start node
                this.startNode = temp[0];
            }
        }));
        this.nodes = null;
        this.nodes = dojo.clone(temp);
        if(newCurrIdx != -1){
            this.currentNode = this.nodes[newCurrIdx];
        }
        else{
            this.currentNode = this.nodes[currentIdx];
        }
        this.trash = 0;
        this._resetCMap();
    },

    /*
     * Resets the mapping from x,y coords to node indexes
     * To be called after a cleanup to update the CMap
     * Calling any other time could create problem because there
     * may be null entries in this.nodes
     * */
    _resetCMap: function(){
        this.cMap = null;
        this.cMap = new Array();
        dojo.forEach(this.nodes, dojo.hitch(this,function(node){
            this.cMap.push({"x": node.x, "y": node.y}, node.nIndex);
        }));
        console.log("Reset CMap: ", this.cMap);
    },
    
    //  randomizes an array
    _randomize: function(array) {
        var i = array.length;
        if ( i == 0 ) return false;
        while ( --i ) {
            var j = Math.floor( Math.random() * ( i + 1 ) );
            var tempi = array[i];
            var tempj = array[j];
            array[i] = tempj;
            array[j] = tempi;
        }
    },
});

dojo.ready(function() {
    var app = new main();        
});
