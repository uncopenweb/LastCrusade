dojo.provide('lastCrusadeMain');
dojo.require('dojo.parser');
dojo.require('dojo.hash');
dojo.require("dojox.timing");
dojo.require('widgets.map');

dojo.declare('lastCrusadeMain', null, {
    constructor: function() {
        this.map = null;
        var def = uow.getAudio({defaultCaching: true});    //get JSonic
        def.then(dojo.hitch(this, function(audio) { 
            this._audio = audio;
            this._initMap();
            this.connect(dojo.global, 'onkeyup', '_removeKeyDownFlag');
            this.connect(dojo.global, 'onkeydown', '_analyzeKey');     
            this._keyHasGoneUp = true;
        }));
    },

    //Load a map
    _initMap: function() {
        var file = 'forest.json';
        var mapRequest = {
            url : "games/" + file,
            handleAs : 'json',
            preventCache: true,
            error: function(error) {console.log(error);}
        };
        var dataDef = dojo.xhrGet(mapRequest);
        dataDef.addCallback(dojo.hitch(this, function(data) { 
            this.map = new widgets.map({mapData: data}, null);        
        }));
    },

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

 //  analyzes user input
    _analyzeKey: function(evt){	//checks keyStrokes
        if (this._keyHasGoneUp) {
        this._keyHasGoneUp = false;              
            else if (this._keyIsDownArrow(evt)) {
                evt.preventDefault();
            }
            else if (this_keyIsLeftArrow(evt)){ //then attempted to move
                evt.preventDefault();
            }
            else if (this.hark._keyIsRightArrow(evt)) { //then attempted to move
                evt.preventDefault();
            }
            else if (this.hark._keyIsUpArrow(evt)) { //then we want to see if correct key hit
                evt.preventDefault();
            }
        }        
        else {
            if (this.hark._keyIsDownArrow(evt) || this.hark._keyIsLeftArrow(evt) || this.hark._keyIsRightArrow(evt) || this.hark._keyIsUpArrow(evt)) {
                evt.preventDefault();
            }
            this._audio.stop({channel: "second"});  //else tooEarlySounds will queue up hit hit fast
            this._audio.play({url: "Sounds/TooEarlyClick", channel : "second"});
        }
    },

    _keyIsLeftArrow: function(keyStroke) {    //boolean is key pressed left arrow
        if (keyStroke.keyCode == dojo.keys.LEFT_ARROW) {
            return true;
        }
        else {
            return false;
        }
    },

    _keyIsRightArrow: function(keyStroke) {    //boolean is key pressed right arrow
        if (keyStroke.keyCode == dojo.keys.RIGHT_ARROW){
            return true;
        }
        else {
            return false;
        }
    },
    
    _keyIsUpArrow: function(keyStroke) {    //boolean is key pressed left arrow
        if (keyStroke.keyCode == dojo.keys.UP_ARROW) {
            return true;
        }
        else {
            return false;
        }
    },
    
    _keyIsDownArrow: function(keyStroke) {    //boolean is key pressed left arrow
        if (keyStroke.keyCode == dojo.keys.DOWN_ARROW) {
            return true;
        }
        else {
            return false;
        }
    },
});

dojo.ready(function() {
    var app = new lastCrusadeMain();        
});
