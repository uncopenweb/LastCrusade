dojo.provide('lastCrusadeMain');
dojo.require('dojo.parser');
dojo.require('dojo.hash');
dojo.require("dojox.timing");
dojo.require('widgets.map');

dojo.declare('lastCrusadeMain', null, {
    constructor: function() {
        this.map = null;
        this.keyDelay = 0;
        var def = uow.getAudio({defaultCaching: true});    //get JSonic
        def.then(dojo.hitch(this, function(audio) { 
            this._audio = audio;
            this._initMap();
            dojo.connect(dojo.global, 'onkeyup', dojo.hitch(this, '_removeKeyDownFlag'));
            dojo.connect(dojo.global, 'onkeydown', dojo.hitch(this, '_analyzeKey'));     
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

    _analyzeKey: function(evt){
        if (this._keyHasGoneUp) {
        this._keyHasGoneUp = false;              
            result = false;
            if (this._keyIsDownArrow(evt)) {
                evt.preventDefault();
                result = this.map.move(this.map.south);
            }
            else if (this._keyIsLeftArrow(evt)){
                evt.preventDefault();
                result = this.map.move(this.map.west);
            }
            else if (this._keyIsRightArrow(evt)) {
                evt.preventDefault();
                result = this.map.move(this.map.east);
            }
            else if (this._keyIsUpArrow(evt)) {
                evt.preventDefault();
                result = this.map.move(this.map.north);
            }
            if(!result){
                this._audio.stop({channel: "main"});
                this._audio.play({url: "sounds/noMove", channel : "main"});
            }
        }        
        else {
            if (this._keyIsDownArrow(evt) || this._keyIsLeftArrow(evt) || this._keyIsRightArrow(evt) || this._keyIsUpArrow(evt)) {
                evt.preventDefault();
            }
            this._audio.stop({channel: "second"});
            this._audio.play({url: "sounds/TooEarlyClick", channel : "second"});
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
