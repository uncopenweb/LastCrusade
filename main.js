/***********************************************************************
*
* TheLastCrusade -- developed for HarkTheSound.org by Robert Overman
*
* From the original Win version:
* www.cs.unc.edu/Research/assist/et/projects/RPG/TheLastCrusade.htm
*
***********************************************************************/
/*  @TODO: Sell back items -> need for primary and secondary weapons??*/

dojo.provide('main');
dojo.require('dojo.parser');
dojo.require('dojo.hash');
dojo.require('dojox.timing');
dojo.require('widgets.map');
dojo.require('widgets.player');
/////////////////////////////////
dojo.require("dijit.form.Slider");
//////////////////////////////////
dojo.declare('main', null, {

    constructor: function() {
        
        dojo.global.WEAPON = 0;
        dojo.global.ARMOR = 1;
        dojo.global.POTION = 2;
        dojo.global.GOLD = 3;
        dojo.global.SPECIAL = 4;

        //state
        //@TODO: All the Y/N states should probably be rolled into
        //one Y/N state with a callback
        this.sOff = 0;
        this.sMenu = 1;
        this.sMove = 2;
        this.sFight = 3;
        this.sRun = 4;
        this.sListen = 5;
        this.sAddItem = 6;
        this.sPotionCycle = 7;
        this.sPotionChoice = 8;
        this.sVendor = 9;
        this.sVendorScroll = 10;
        this.sBuy = 11;
        this.sFriend = 12;
        this.sLepEncounter = 13;
        this.sLepGame = 14;
        this.sLepAgain = 15;
        //---//
        
        this.state = this.sOff;
        this.potentialItems = new Array(); //items to ask player if he/she wants
        this.start = true;
        this.firstFriend = true;
        this.tempItem = null;

        this.skipVendors = false;
        this.skipFriends = false;
        this.skipLep = false;
        this._mapIndex = 0;
        this.map = null;
        this.enemy = null;
        this.vendor = null;
        this.friend = null;
        this.enemyData = null;
        this.vendorData = null;
        this.friendData = null;
        this.lepArray = new Array(3);
        this.lepData = null;
        this.keyDelay = 0;
        this.directions = dojo.byId("directions");
        this.offerSaying ="";

        //handles//
        this.pauseHandle = null;
        this.prefsHandle = null;
        //-------//

        this._readingInstructions = false;
        this.duringMove = false;
        this.potionIndex = 0;
        this.itemIndex = 0;
        
        //messages to display with corresponding state
        var stateHandle = dojo.subscribe("stateStatus", dojo.hitch(this, function(message){
            switch (message){
            case this.sOff:
                this.directions.innerHTML = "";
                break;
            case this.sMenu:
                this.directions.innerHTML = "1: New Game <br> 2: Resume Saved Game  <br> 3: Instructions For Playing";
                break;
            case this.sMove:
                this.directions.innerHTML = "Up Arrow: Move North <br> Down Arrow: Move South <br> Right Arrow: Move East <br> Left Arrow: Move West <br> S: Search Location for Items <br> D: Query Directions <br> P: Use Potion";
                break;
            case this.sFight:
                this.directions.innerHTML = "A: Attack <br> R: Attempt to Run Away <br> P: Use Potion <br> Q: Query Enemy ";
                break;
            case this.sRun:
                this.directions.innerHTML = "Up Arrow: Yes, run away <br> Down Arrow: No, stay and fight";
                break;
            case this.sListen:
                this.directions.innerHTML = "F: Skip";
                break;
            case this.sAddItem:
                this.directions.innerHTML = "Up Arrow: Yes, add item <br> Down Arrow: No, discard item";
                break;
            case this.sPotionCycle:
                this.directions.innerHTML = "Use the left and right arrow keys to cycle through the potions <br> Press Escape to cancel";
                break;
            case this.sPotionChoice:
                this.directions.innerHTML = "Up Arrow: Accept, use potion <br> Left/Right Arrow: Choose Another <br> Press Escape to cancel";              
                break;
            case this.sVendor:
                this.directions.innerHTML = "Up Arrow: Yes check out inventory <br> Down Arrow: No, I don't want to buy anything";
                break;
            case this.sVendorScroll:
                this.directions.innerHTML = "Up Arrow: Buy item <br> Left/Right Arrow: Choose Another <br> Escape: Return to game";              
                break;   
            case this.sBuy:
                this.directions.innerHTML = "Up Arrow:: Yes, buy item <br> Down Arrow: No, continue looking";         
                break;
            case this.sFriend:
                this.directions.innerHTML = "Up Arrow: Talk to friend <br> Down Arrow: Do not talk to friend";
                break;
            case this.sLepEncounter:
                this.directions.innerHTML = "Up Arrow: Play the leprechaun's game <br> Down Arrow: Refuse to play";
                break;
            case this.sLepGame:
                this.directions.innerHTML = "Press 1,2 or 3 to play <br> Press 'A' to attempt to kill the leprechaun.";
                break;
            case this.sLepAgain:
                this.directions.innerHTML = "Up Arrow: Play again <br> Down Arrow: Don't play again";
                break;
            }
        })); 
        var def = uow.getAudio({defaultCaching: true});    //get JSonic
        def.then(dojo.hitch(this, function(audio) { 
            this._audio = audio;
             ///////////////////////REMOVE AFTER MOVING TO HARK SITE/////////
            var slider = new dijit.form.HorizontalSlider({
                name: "master",
                value: 1,
                minimum: 0,
                maximum: 1,
                intermediateChanges: true,
                style: "width:300px;",
                onChange: dojo.hitch(this, function(val) {
                    this._audio.setProperty({name : 'volume', value: val, channel : 'music', immediate : true});
                    this._audio.setProperty({name : 'volume', value: val, channel : 'sound', immediate : true});
                    this._audio.setProperty({name : 'volume', value: val, channel : 'speech', immediate : true});
                    if(this.map){
                        this.map.changeVolume(val);
                    }
                    if(this.player){
                        this.player.changeVolume(val);
                    }
                })
            },
            "master");
            var slider = new dijit.form.HorizontalSlider({
                name: "speechRate",
                value: 150,
                minimum: 1,
                maximum: 300,
                intermediateChanges: true,
                style: "width:300px;",
                onChange: dojo.hitch(this,function(val) {
                    this._audio.setProperty({name : 'rate', value: Math.floor(val), channel : 'speech', immediate : true});
                    if(this.player){
                        this.player.changeRate(val);
                    }
                })
            },
            "speechRate");
            var slider = new dijit.form.HorizontalSlider({
                name: "speechVol",
                value: 1,
                minimum: 0,
                maximum: 1,
                intermediateChanges: true,
                style: "width:300px;",
                onChange: dojo.hitch(this,function(val) {
                    this._audio.setProperty({name : 'volume', value: val, channel : 'speech', immediate : true});
                    if(this.player){
                        this.player.changeVolume(val);
                    }
                })
            },
            "speechVol");
            var slider = new dijit.form.HorizontalSlider({
                name: "soundVol",
                value: 1,
                minimum: 0,
                maximum: 1,
                intermediateChanges: true,
                style: "width:300px;",
                onChange: dojo.hitch(this,function(val) {
                    this._audio.setProperty({name : 'volume', value: val, channel : 'sound', immediate : true});
                })
            },
            "soundVol");
            var slider = new dijit.form.HorizontalSlider({
                name: "music",
                value: 1,
                minimum: 0,
                maximum: 1,
                intermediateChanges: true,
                style: "width:300px;",
                onChange: dojo.hitch(this,function(val) {
                    if(this.map){
                        this.map.changeVolume(val);
                    }
                    this._audio.setProperty({name : 'volume', value: val, channel : 'music', immediate : true});
                })
            },
            "music");
            ////////////////////////////////////////////////////////////////
            this._initSounds();
            dojo.connect(dojo.global, 'onkeyup', dojo.hitch(this, '_removeKeyDownFlag'));
            dojo.connect(dojo.global, 'onkeydown', dojo.hitch(this, '_analyzeKey'));
            this.pauseHandle = dojo.subscribe('/org/hark/pause', this.pauseCallback());
            this.prefsHandle = dojo.subscribe('/org/hark/prefs/response', this.prefsCallback());
            this._keyHasGoneUp = true;
            this._start();
        }));           
    },

    ////////////////--------Hark Integration----------------////////////

    pauseCallback: function(paused){
        if(paused){
            console.log("Paused");
        }
        else{
            console.log("Unpaused");
        }
    },

    prefsCallback: function(prefs, which){
        if(which == null){ //do everything

        }
        else if(which == "mouseEnabled"){

        }
        else if(which == "speechRate"){
            this._audio.setProperty({name : 'rate', value: Math.floor(prefs.speechRate), channel : 'speech', immediate : true});
            if(this.player){
                this.player.changeRate(prefs.speechRate);
            }
        }
        else if(which == "volume"){
            this._audio.setProperty({name : 'volume', value: prefs.volume, channel : 'music', immediate : true});
            this._audio.setProperty({name : 'volume', value: prefs.volume, channel : 'sound', immediate : true});
            this._audio.setProperty({name : 'volume', value: prefs.volume, channel : 'speech', immediate : true});
            if(this.map){
                this.map.changeVolume(prefs.volume);
            }
            if(this.player){
                this.player.changeVolume(prefs.volume);
            }
        }
        else if(which == "speechVolume"){
            this._audio.setProperty({name : 'volume', value: prefs.speechVolume, channel : 'speech', immediate : true});
            if(this.player){
                this.player.changeVolume(prefs.speechVolume);
            }
        }
        else if(which == "soundVolume"){
            this._audio.setProperty({name : 'volume', value: prefs.soundVolume, channel : 'sound', immediate : true});
        }
        else if(which == "musicVolume"){
            if(this.map){
                this.map.changeVolume(prefs.musicVolume);
            }
            this._audio.setProperty({name : 'volume', value: prefs.musicVolume, channel : 'music', immediate : true});
                
        }
    },

    ////////////////////////////////////////////////////////////////////

    /*******************************************************************
     *
     * Resets all boolean values/other game data for restarting the game
     * for when player killed for example
     * 
     ******************************************************************/
    _gameReset: function(){
        this.state = this.sOff;
        this.potentialItems = new Array(); //items to ask player if he/she wants
        this.start = true;
        this.firstFriend = true;
        this.tempItem = null;

        this.skipVendors = false;
        this.skipFriends = false;
        this.skipLep = false;
        this._mapIndex = 0;
        this.map = null;
        this.enemy = null;
        this.vendor = null;
        this.friend = null;
        this.enemyData = null;
        this.vendorData = null;
        this.friendData = null;
        this.player = null;
        this.lepArray = new Array(3);
        this.lepData = null;
        this.keyDelay = 0;
        this.offerSaying ="";

        this._readingInstructions = false;
        this.duringMove = false;
        this.potionIndex = 0;
        this.itemIndex = 0;   
    },

    /*******************************************************************
     *
     * begin gameplay
     *
     ******************************************************************/
    _start: function(){
        var sRate = 1;
        this.mapList = ["forest.json", "graveyard.json", "castle.json"];
        this._audio.getProperty({name:'rate', channel: 'speech'})
        .anyAfter(dojo.hitch(this,function(rate){
            sRate = rate;
            this._audio.getProperty({name:'volume', channel: 'speech'})
            .anyAfter(dojo.hitch(this,function(volume){
                var ad = {rate:sRate, volume: volume};
                this.player = new widgets.player({audioData: ad}, null); 
                this._audio.play({url: 'sounds/general/' + this.title, channel:'sound'});
                this._audio.setProperty({name: 'loop', channel: 'music', value: true});
                this._audio.play({url: "sounds/general/"+ this.theme, channel: 'music'});
                this._audio.play({url: "sounds/general/" + this.menu, channel: 'sound'});
                this.setState(this.sMenu);     
            }));
        }));       
    },

    /*******************************************************************
     *
     * Load the map and visit the first node. Also sets up how to
     * handle game widget destruction
     * 
     ******************************************************************/
    _loadMap: function(fileName) {
        var mapHandle = dojo.subscribe("mapStatus", dojo.hitch(this, function(message){
            if (message == "mapDestroy") {
                dojo.unsubscribe(mapHandle);
                this._mapIndex++;
                if(this._mapIndex==this.mapList.length)
                {
                    //done with game, do something
                    console.log("Finished all games");
                }
                else
                {
                    this._loadMap(this.mapList[this._mapIndex]);                    
                }                
            }
        })); 
        var file = fileName;
        var mapRequest = {
            url : "games/" + file,
            handleAs : 'json',
            preventCache: true,
            error: function(error) {console.log(error);}
        };
        var dataDef = dojo.xhrGet(mapRequest);
        dataDef.addCallback(dojo.hitch(this, function(data) {
            this._audio.getProperty({name:'volume', channel:'music'})
            .anyAfter(dojo.hitch(this,function(volume){
                this.map = new widgets.map({mapData: data, audioData: {volume: volume}}, null); 
                if(this.start){
                    this.start = false;
                }
                else{
                    this.player.equipWeakItems(this.map);
                }
                this._audio.say({text: "You are now entering the " + this.map.Name, channel: 'speech'})
                .anyAfter(dojo.hitch(this,function(){
                    this.setState(this.sMove);
                    this.exploreNode();
                }));   
            })); 
            
        }));
    },

    /*******************************************************************
     *
     * Remove key down flag. Checking key down flag prevents streaming
     * requests to server from holding down a key
     *
     ******************************************************************/
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

    /*******************************************************************
     *
     * setup all sound names from original game, most will eventually
     * be deleted
     *
     ******************************************************************/
    _initSounds: function(){
        this.theme = "main_theme";
	    this.title = "title";
	    // Story
	    this.story = "introduction";
	    this.ending = "end_king";
	    // Menu
	    this.menu = "menu";
	    // Directions
	    this.dirChar = "dir_characters";
	    this.dirEnem = "dir_enemy";
	    this.dirItem = "dir_items";
	    this.dirLoca = "dir_location";
	    this.dirSave = "dir_save";
	    this.dirSkip = "dir_skip";
	    this.dirSpac = "dir_spacebar";
	    this.dirQuit = "dir_quit";
 	
	    // Battle
	    this.fightsong = "fight";
 			
	    // Leprechaun
	    this.lepplay = "play_lep";
	    this.lepmore = "more_lep";
	    this.lepgone = "lepgone";
	    this.leprules = "rules_lep";
	    this.lep123 = "123_lep";
	    this.lepwin = "pwin_lep";
	    this.leplose = "plose_lep";
	    this.lepagain = "again_lep";
	    this.lepbye = "goodbye_lep";
	    this.lepgood = "noplaygood_lep";
	    this.lepmad = "noplaymad_lep";
	    this.leplive = "survive_lep";
	    this.lepdie = "death_lep";
	
	    // Misc		
	    this.instruct = "g_instruc";
        this.equip = "equip";
    },
    
    /*******************************************************************
     *
     * Analyze user input given the state of the game
     *
     ******************************************************************/
    _analyzeKey: function(evt){
        if (this._keyHasGoneUp) {
            this._keyHasGoneUp = false;             
                switch(this.state){  
                    case this.sOff:
                        break;
                    case this.sMove:
                        var result;
                        switch(evt.keyCode){
                            case dojo.keys.DOWN_ARROW:
                                this.setState(this.sOff);
                                this.player.stopAudio();
                                evt.preventDefault();
                                result = this.map.move(this.map.SOUTH, this.player);
                                this.moveResult(result);
                                break;
                            case dojo.keys.LEFT_ARROW:
                                this.setState(this.sOff);
                                this.player.stopAudio();
                                evt.preventDefault();
                                result = this.map.move(this.map.WEST, this.player);
                                this.moveResult(result);
                                break;
                            case dojo.keys.RIGHT_ARROW:
                                this.setState(this.sOff);
                                this.player.stopAudio();
                                evt.preventDefault();
                                result = this.map.move(this.map.EAST, this.player);
                                this.moveResult(result);
                                break;
                            case dojo.keys.UP_ARROW:
                                this.setState(this.sOff);
                                this.player.stopAudio();
                                evt.preventDefault();
                                result = this.map.move(this.map.NORTH, this.player);
                                this.moveResult(result);
                                break;
                            case dojo.keys.SPACE:
                                this.setState(this.sOff);
                                this.fadeChannel('music');
                                this._stopAudio();
                                this.player.readStats();
                                //don't need to wait through all of stats
                                this.setState(this.sMove);                              
                                break;    
                            case 83: //search for items
                                this.setState(this.sOff);
                                this._stopAudio();
                                var def = this.examineItems(this.map.nodes[this.map.currentNodeIndex].Items, "You found ");
                                def.then(dojo.hitch(this,function(result){
                                    if(result.found){
                                        //empty item array
                                        this.map.nodes[this.map.currentNodeIndex].Items = new Array();
                                        this.setState(this.sMove);               
                                    }
                                    else{
                                        this._audio.say({text:"You did not find any items.", channel:'speech'});
                                        this.setState(this.sMove);        
                                    }
                                }));

                                break;
                            case 68: //query directions
                                this.setState(this.sOff);
                                this._stopAudio();
                                var directions = this.map.queryDirections();
                                var stringArr = new Array();
                                if(directions[0]!= -1){
                                    stringArr.push(" north,");
                                }
                                if(directions[1]!= -1){
                                    stringArr.push(" south, ");
                                }
                                if(directions[2]!= -1){
                                    stringArr.push(" east, ");
                                }
                                if(directions[3]!= -1){
                                    stringArr.push(" west, ");
                                }
                                
                                if(stringArr.length == 1){
                                    this._audio.say({text: "The " + stringArr[0] + " passage is open.", channel: 'speech'});
                                }
                                else{
                                    this._audio.say({text: " The ", channel: 'speech'});
                                    dojo.forEach(stringArr, dojo.hitch(this,function(dir, idx){
                                        if(idx == (stringArr.length -1)){
                                            this._audio.say({text: " and ", channel: 'speech'});
                                        }
                                        this._audio.say({text: dir, channel: 'speech'});
                                    }));
                                    this._audio.say({text:" passages are open.", channel: 'speech'});
                                }
                                this.setState(this.sMove);                                
                                break;
                            case 80: //P: use potion if available
                                    this.setState(this.sOff);
                                    this.player.stopAudio();
                                    if(this.player.potions.length != 0){
                                        this._audio.say({text:"Use the left and right arrow keys to cycle through the potions. Press the up arrow to select a potion and escape to cancel.", channel: "speech"});
                                        this.duringMove = true;
                                        this.setState(this.sPotionCycle);   
                                    }
                                    else{
                                        this._audio.say({text:"You do not have any potions.", channel: "speech"})
                                        .anyAfter(dojo.hitch(this,function(){
                                            this.setState(this.sMove);
                                        }));
                                    }
                                break;
                            /* @TODO: REMOVE AFTER DEBUGGING DONE!!!!!!!!!!!*/
                            case 71:
                                this.player.hp = 100;
                                this.player.strength = 100;
                                this.player.defense = 1000;
                                break;
                        }
                        break;
                    case this.sMenu:
                        switch(evt.keyCode){
                            // 3 to read the menu
                            case dojo.keys.NUMPAD_3:
                            case 51:
                                this.setState(this.sOff);
                                this.fadeChannel('sound');
                                this.readMenu();
                                break;
                            // 1 to start new game
                            case dojo.keys.NUMPAD_1:
                            case 49:
                                this.setState(this.sOff);
                                var d1 = this.fadeChannel('music');
                                d1.then(dojo.hitch(this, function(){
                                    var def3 = this.fadeChannel('sound')
                                    return def3;
                                })).then(dojo.hitch(this, function(){
                                    this.setState(this.sListen);
                                    this._audio.play({url: 'sounds/general/' + this.story, channel: 'speech'})
                                        .anyAfter(dojo.hitch(this, function(){
                                        //state is changed again in load map to move
                                        this._loadMap(this.mapList[this._mapIndex]);                            
                                    }));
                                }));
                                break;
                        }
                        break;
                    case this.sFight: 
                        switch(evt.keyCode){
                            case 65: // A attack
                                this.setState(this.sOff);
                                this.player.stopAudio();
                                //player attack
                                var def = this.playerAttack();
                                def.then(dojo.hitch(this, function(result){
                                    if(result.vanquished){
                                        var def2 = this.examineItems(this.enemy.Items, "You recovered ");
                                        def2.then(dojo.hitch(this,function(){                                          
                                            this.map.removeNPC(this.enemyData[1]);
                                            this.enemy = null;
                                            this.setState(this.sMove);
                                            this.map.visitCurrentNode();
                                        }));
                                    }
                                    else{
                                        var def = this.enemyAttack();
                                        def.then(dojo.hitch(this,function(){
                                            this.setState(this.sFight);
                                        }));               
                                    }
                                }));
                                break;
                            case 82: //R run away
                                this.setState(this.sOff);
                                this.player.stopAudio();
                                var randZeroTo99=Math.floor(Math.random()*100);
                                if(randZeroTo99 > this.enemy.RunPerc){ //fail
                                    this._audio.say({text: "Your attempt to run away has failed. You must continue to fight the " + this.enemy.Name, channel:'speech'})
                                        .anyAfter(dojo.hitch(this, function(){
                                            var def = this.enemyAttack();
                                            def.then(dojo.hitch(this,function(){
                                                this.setState(this.sFight);
                                            }));
                                        }));
                                }
                                else{//success
                                    this.fadeChannel("music");
                                    this._audio.say({text: "You have abandoned the fight and returned to your previous location.", channel:'speech'});

                                    //restore enemy health if you run away
                                    this.enemy.HP = this.enemy.MaxHP;

                                    this.enemy = null;
                                    var def = this.map.returnPrevious();
                                    def.then(dojo.hitch(this,function(){
                                        this.setState(this.sMove);
                                    }));
                                }                                
                                break;
                            
                            case 80: //P: use potion if available
                                this.setState(this.sOff);
                                this.player.stopAudio();
                                if(this.player.potions.length != 0){
                                    this._audio.say({text:"Use the left and right arrow keys to cycle through the potions.  Press the up arrow to select a potion and escape to cancel.", channel: "speech"});
                                    this.setState(this.sPotionCycle);   
                                }
                                else{
                                    this._audio.say({text:"You do not have any potion.", channel: "speech"})
                                    .anyAfter(dojo.hitch(this,function(){
                                        this.setState(this.sFight);
                                    }));
                                }
                                break;
                            case 81: //Q
                                this.setState(this.sOff);
                                this.player.stopAudio();
                                this._queryEnemy();
                                this.setState(this.sFight);
                                break;
                            /* @TODO: REMOVE AFTER DEBUGGING DONE!!!!!!!!!!!*/
                            case 75: //set enemy health to 0
                                this.enemy.HP = 0;
                                break;
                            case 71:
                                this.player.hp = 100;
                                this.player.strength = 100;
                                this.player.defense = 1000;
                                break;
                        }  
                        break;
                    case this.sRun:
                        switch(evt.keyCode){
                            case dojo.keys.UP_ARROW: //Y
                                this.setState(this.sOff);
                                this._audio.stop({channel: "speech"});
                                var randZeroTo99=Math.floor(Math.random()*100);
                                if(randZeroTo99 > this.enemy.RunPerc){ //fail
                                    this._audio.say({text: "Your attempt to run away has failed. You must now fight the " + this.enemy.Name, channel:'speech'})
                                        .anyAfter(dojo.hitch(this, function(){
                                            var def = this.enemyAttack();
                                            def.then(dojo.hitch(this,function(){
                                                this.setState(this.sFight);
                                            }));
                                        }));
                                }
                                else{//success
                                    this.fadeChannel("music");
                                    this._audio.say({text: "You have avoided the " + this.enemy.Name + " and returned to your previous location.", channel:'speech'});

                                    this.enemy = null;
                                    var def = this.map.returnPrevious();
                                    def.then(dojo.hitch(this,function(){
                                        this.setState(this.sMove);
                                    }));
                                }
                            break;
                            case dojo.keys.DOWN_ARROW: //N
                                this.setState(this.sOff);
                                this._audio.stop({channel: "speech"});
                                //enemy should also attack
                                this._audio.say({text: "You have chosen to stand your ground.", channel:'speech'})
                                    .anyAfter(dojo.hitch(this, function(){
                                        var def = this.enemyAttack();
                                        def.then(dojo.hitch(this,function(){
                                            this.setState(this.sFight);
                                        }));
                                    }));
                            break;
                        }
                        break;
                    case this.sListen:
                        switch(evt.keyCode){
                        // 'f' to stop sounds on main
                        case 70:
                            this.setState(this.sOff);
                            this._stopAudio();
                            if(this._readingInstructions){
                                this._readingInstructions = false;
                                this._audio.play({url: "sounds/general/"+ this.theme, channel:'music'});
                                this.setState(this.sMenu);
                            }
                            break;
                        }
                        break;
                    case this.sAddItem:
                        switch(evt.keyCode){
                            case dojo.keys.UP_ARROW: //Y
                                this.setState(this.sOff);
                                this._audio.play({url: "sounds/general/"+ this.equip, channel: 'sound'});
                                this._audio.say({text: this.tempItem.iName + " equipped.", channel: 'speech'});
                                this.player.addItem(this.tempItem);
                                this.tempItem = null;
                                this.offerItems();                                
                            break;
                            case dojo.keys.DOWN_ARROW: //N
                                this.setState(this.sOff);
                                this.tempItem = null;
                                this.offerItems();   
                            break;
                        }
                        break;
                    case this.sPotionCycle:
                        var move = false;
                        switch(evt.keyCode){
                            case dojo.keys.LEFT_ARROW:
                                this.setState(this.sOff);
                                this._audio.stop({channel:'speech'});
                                move = true;
                                if(--this.potionIndex < 0){
                                    this.potionIndex = (this.player.potions.length - 1);
                                }
                                break;
                            case dojo.keys.RIGHT_ARROW:
                                this.setState(this.sOff);
                                this._audio.stop({channel:'speecj'});
                                move = true;
                                if(++this.potionIndex >= this.player.potions.length){
                                    this.potionIndex = 0;
                                }
                                break;
                            case dojo.keys.ESCAPE:
                                this.setState(this.sOff);
                                this._audio.stop({channel:'speech'});
                                this.player.stopAudio();
                                if(this.duringMove){
                                    this.duringMove = false;
                                    this.setState(this.sMove);
                                }
                                else{
                                    this.setState(this.sFight);
                                }
                                break;
                        }
                        if(move){
                            this._audio.say({text: this.player.potions[this.potionIndex].iName + "level " + this.player.potions[this.potionIndex].iValue, channel: "speech"});
                            this.setState(this.sPotionChoice);
                        }
                        break; 
                    case this.sPotionChoice:
                        switch(evt.keyCode){
                            case dojo.keys.LEFT_ARROW:
                                this.setState(this.sOff);
                                this._audio.stop({channel:'speech'});
                                if(--this.potionIndex < 0){
                                    this.potionIndex = (this.player.potions.length - 1);
                                }
                                this._audio.say({text: this.player.potions[this.potionIndex].iName + "level " + this.player.potions[this.potionIndex].iValue, channel: "speech"});
                                this.setState(this.sPotionChoice);
                                break;
                            case dojo.keys.RIGHT_ARROW:
                                this.setState(this.sOff);
                                this._audio.stop({channel:'speech'});
                                if(++this.potionIndex >= this.player.potions.length){
                                    this.potionIndex = 0;
                                }
                                this._audio.say({text: this.player.potions[this.potionIndex].iName + "level " + this.player.potions[this.potionIndex].iValue, channel: "speech"});
                                this.setState(this.sPotionChoice);
                                break;
                            case dojo.keys.UP_ARROW: //accept
                                this.setState(this.sOff);
                                this._audio.stop({channel:'speech'});
                                this._usePotion();                           
                                break;
                            case dojo.keys.ESCAPE:
                                this.setState(this.sOff);
                                this._audio.stop({channel:'speech'});
                                this.player.stopAudio();
                                if(this.duringMove){
                                    this.duringMove = false;
                                    this.setState(this.sMove);
                                }
                                else{
                                    this.setState(this.sFight);
                                }
                                break;
                        }
                        break; 
                    case this.sVendor:
                        switch(evt.keyCode){
                            case dojo.keys.UP_ARROW: //Y
                                this.setState(this.sOff);
                                this._audio.stop({channel:'speech'});
                                this.player.stopAudio();
                                this._audio.say({text: "You currently have " + this.player.gold + " gold.", channel:'speech'});
                                this._audio.say({text: "Use the arrow keys to cycle through the options and press the up arrow to select a purchase. Press escape to return to the game.", channel:'speech'});
                                this.setState(this.sVendorScroll);
                            break;
                            case dojo.keys.DOWN_ARROW: //N
                                this.setState(this.sOff);
                                this._audio.stop({channel:'speech'});
                                this.player.stopAudio();
                                this.skipVendors = true;
                                this.vendor = null;
                                this.exploreNode();
                            break;
                        }
                        break; 
                    case this.sVendorScroll:
                        switch(evt.keyCode){
                            case dojo.keys.LEFT_ARROW:
                                this.setState(this.sOff);
                                this._audio.stop({channel:'speech'});
                                if(--this.itemIndex < 0){
                                    this.itemIndex = (this.vendor.Items.length - 1);
                                }
                                this._audio.say({text: this.vendor.Items[this.itemIndex].iName + "price " + this.vendor.Items[this.itemIndex].iValue + " gold.", channel: "speech"});
                                this.setState(this.sVendorScroll);
                                break;
                            case dojo.keys.RIGHT_ARROW:
                                this.setState(this.sOff);
                                this._audio.stop({channel:'speech'});
                                if(++this.itemIndex >= this.vendor.Items.length){
                                    this.itemIndex = 0;
                                }
                                this._audio.say({text: this.vendor.Items[this.itemIndex].iName + "price " + this.vendor.Items[this.itemIndex].iValue + " gold.", channel: "speech"});
                                this.setState(this.sVendorScroll);
                                break;
                            case dojo.keys.UP_ARROW: //Buy
                                this.setState(this.sOff);
                                this._audio.stop({channel:'speech'});
                                this._buyItem();                           
                                break;
                            case dojo.keys.ESCAPE:
                                this.setState(this.sOff);
                                this._audio.stop({channel:'speech'});
                                this.player.stopAudio();
                                this.skipVendors = true;
                                this.vendor = null;
                                this.exploreNode();
                                break;
                        }
                    break;
                    case this.sBuy:
                        switch(evt.keyCode){
                            case dojo.keys.UP_ARROW: //Y
                                this.setState(this.sOff);
                                this._audio.stop({channel:'speech'});
                                if(this.player.gold < this.vendor.Items[this.itemIndex].iValue){
                                    this._audio.say({text:"You cannot afford this item.", channel:'speech'});
                                    this.setState(this.sVendorScroll);
                                }
                                else{
                                    this._audio.play({url: "sounds/general/"+ this.equip, channel: 'sound'});
                                    this.player.addItem(dojo.clone(this.vendor.Items[this.itemIndex]));
                                    //take away gold
                                    this.player.gold-= this.vendor.Items[this.itemIndex].iValue;
                                    if(this.vendor.Items[this.itemIndex].iType != dojo.global.POTION){
                                        this.vendor.Items.splice(this.itemIndex, 1);
                                    }
                                    this.itemIndex = 0;
                                    
                                    if(this.vendor.Items.length == 0){
                                        this._audio.say({text: "That was the last item in our inventory. Thank you for your business.", channel: 'speech'})
                                        .anyAfter(dojo.hitch(this,function(){
                                            //remove vendor
                                            this.map.removeNPC(this.vendorData[1]);                                        
                                            this.vendor = null;
                                            this.exploreNode();
                                        }));
                                    }
                                    else{
                                        this._audio.say({text: "You currently have " + this.player.gold + " gold.", channel:'speech'});
                                        this._audio.say({text: "Use the arrow keys to cycle through the options and press up to select a purchase. Press escape to return to the game.", channel:'speech'});
                                        this.setState(this.sVendorScroll);
                                    }
                                }
                                
                            break;
                            case dojo.keys.DOWN_ARROW: //N
                                this.setState(this.sOff);
                                this._audio.stop({channel:'speech'});
                                this._audio.say({text: "You currently have " + this.player.gold + " gold.", channel:'speech'});
                                this._audio.say({text: "Use the arrow keys to cycle through the options and press bee to select a purchase. Press escape to return to the game.", channel:'speech'});
                                this.setState(this.sVendorScroll);
                            break;
                        }
                    break;
                    //have to fill up an array, go through it one by one and callback when all done
                    case this.sFriend:
                        switch(evt.keyCode){
                            case dojo.keys.UP_ARROW: //Y
                                this.setState(this.sOff);
                                this._audio.stop({channel:'speech'});
                                this.player.stopAudio();
                                //play sound and give all items to player
                                this._audio.play({url: "sounds/" + this.map.Name + ".sounds/" + this.map.sounds[this.friend.ActionSound], channel: 'speech'})
                                    .anyAfter(dojo.hitch(this,function(){
                                        var def = this.examineItems(this.friend.Items, this.friend.Name+ "has given you ");
                                        def.then(dojo.hitch(this,function(){
                                            //remove friend or what??
                                            this.map.removeNPC(this.friendData[1]);
                                            this.friend = null;
                                            this.exploreNode();
                                        }));
                                    }));
                                this.setState(this.sListen);
                            break;
                            case dojo.keys.DOWN_ARROW: //N
                                this.setState(this.sOff);
                                this._audio.stop({channel:'speech'});
                                this.player.stopAudio();
                                this.skipFriends = true;
                                this.friend = null;
                                this.exploreNode();
                            break;
                        }                    
                    break;
                    case this.sLepEncounter:
                        switch(evt.keyCode){
                            case dojo.keys.UP_ARROW: //Y
                                this.setState(this.sOff);
                                this._audio.stop({channel:'speech'});
                                this.player.stopAudio();
                                if(this.player.gold < 50){
                                    this._audio.play({url: "sounds/general/" + this.lepmore, channel:'speech'});
                                    this.skipLep = true;
                                    this.lepData = null;
                                    this.exploreNode();
                                }
                                else{
                                    this._audio.play({url: "sounds/general/" + this.leprules, channel: 'speech'});
                                    this.startLepGame();
                                }
                            break;
                            case dojo.keys.DOWN_ARROW: //N
                                this.setState(this.sOff);
                                this._audio.stop({channel:'speech'});
                                this.player.stopAudio();
                                this.skipLep = true;
                                if(Math.floor(Math.random()*(2)) > 0){
                                    this._audio.play({url: "sounds/general/" + this.lepmad, channel: 'speech'});
                                    this.player.halfGold();
                                    this._audio.say({text: "The leprekaun has run away and taken half of your gold with him.", channel: 'speech'});
                                    this._audio.say({text: "You now have " + this.player.gold + " gold pieces.", channel: 'speech'})
                                        .anyAfter(dojo.hitch(this,function(){
                                            this.exploreNode();
                                        }));
                                }
                                else{
                                    this._audio.play({url: "sounds/general/" + this.lepgood, channel: 'sound'})
                                        .anyAfter(dojo.hitch(this,function(){
                                            this.exploreNode();
                                        }));
                                }
                                this.lepData = null;
                            break;
                        }
                    break;
                    case this.sLepGame:
                        switch(evt.keyCode){
                            case dojo.keys.NUMPAD_1:
                            case 49:
                                this.setState(this.sOff);
                                this._audio.stop({channel:'speech'});
                                this.player.stopAudio();
                                this.lepResponse(this.lepArray[0]);
                                break;
                            case dojo.keys.NUMPAD_2:
                            case 50:
                                this.setState(this.sOff);
                                this._audio.stop({channel:'speech'});
                                this.player.stopAudio();
                                this.lepResponse(this.lepArray[1]);                            
                                break;
                            case dojo.keys.NUMPAD_3:
                            case 51:
                                this.setState(this.sOff);
                                this._audio.stop({channel:'speech'});
                                this.player.stopAudio();
                                this.lepResponse(this.lepArray[2]);
                                break;
                                
                            case 65: //attack
                                this.setState(this.sOff);
                                this._audio.stop({channel:'speech'});
                                this.player.stopAudio();
                                if(Math.floor(Math.random()*(2))==0){//killed
                                    this._audio.play({url: 'sounds/general/' + this.lepdie, channel: 'speech'});
                                    var def = this.examineItems(this.lepData[0].Items, "You took ");
                                    def.then(dojo.hitch(this,function(){                                          
                                        this.map.removeNPC(this.lepData[1]);
                                        this.lepData = null;
                                        this.exploreNode();
                                    }));
                                }
                                else{//fail
                                    this._audio.play({url: 'sounds/general/' + this.leplive, channel: 'speech'});
                                    this.player.halfHealth();
                                    this.player.removePotions();
                                    if(this.player.hp == 1){
                                        this._audio.say({text: "You now have " + this.player.hp + " hit point and no potions.", channel: 'speech'});
                                    }
                                    else{
                                        this._audio.say({text: "You now have " + this.player.hp + " hit points and no potions.", channel: 'speech'});
                                    }
                                    this.map.removeNPC(this.lepData[1]);
                                    this.lepData = null;
                                    this.exploreNode();
                                }
                                break;
                            }                            
                    break;
                    case this.sLepAgain:
                        switch(evt.keyCode){
                         case dojo.keys.UP_ARROW: //Y
                            this.setState(this.sOff);
                            this._audio.stop({channel:'speech'});
                            this.player.stopAudio();
                            this.startLepGame();
                            break;
                         case dojo.keys.DOWN_ARROW: //N
                            this.setState(this.sOff);
                                this._audio.stop({channel:'speech'});
                                this.player.stopAudio();
                            this._audio.play({url: 'sounds/general/' + this.lepbye, channel: 'speech'});
                            this.skipLep = true;
                            this.exploreNode();
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

    /*******************************************************************
     *
     * Setup a game with encountered leprechaun
     *
     ******************************************************************/
    startLepGame: function(){
    this._audio.play({url: "sounds/general/" + this.lep123, channel: 'speech'});
        var temp = Math.floor(Math.random()*(3));
        if(temp == 0){
            this.lepArray[0] = -50;
            this.lepArray[1] = 25;
            this.lepArray[2] = 25;
        }
        else if(temp == 1){
            this.lepArray[0] = -50;
            this.lepArray[1] = 35;
            this.lepArray[2] = 35;
        }
        else{
            this.lepArray[0] = -50;
            this.lepArray[1] = -50;
            this.lepArray[2] = 75;
        }
        this._randomize(this.lepArray);
        this.setState(this.sLepGame);    
    },
    
    /*******************************************************************
     * 
     * Sequence after player has chosen 1-3 during lep game
     * 
     ******************************************************************/
    lepResponse: function(choice){
        this.player.gold+=choice;
        if(choice > 0){ //win
            this._audio.play({url: 'sounds/general/' + this.lepwin, channel: 'speech'});
        }
        else{ //lose
            this._audio.play({url: 'sounds/general/' + this.leplose, channel: 'speech'});
        }
        this._audio.say({text: "You now have " + this.player.gold + " gold pieces.", channel: 'speech'});
        
        if(this.player.gold < 50){
            this._audio.play({url: "sounds/general/" + this.lepmore, channel:'speech'});
            this.skipLep = true;
            this.lepData = null;
            this.exploreNode();
        }
        else{
            this._audio.play({url: 'sounds/general/' + this.lepagain, channel: 'speech'});
            this.setState(this.sLepAgain);
        }
    },
    
    /*******************************************************************
     *
     * Use the potion selected
     *
     ******************************************************************/
    _usePotion:function(){
        this._audio.play({url: 'sounds/general/potion_a', channel:'sound'})
            .anyAfter(dojo.hitch(this,function(){
            var def = this.player.updateHPplusWait(this.player.potions[this.potionIndex].iValue);
            //delete potion
            this.player.potions.splice(this.potionIndex, 1); 
            this.potionIndex = 0;
            def.then(dojo.hitch(this,function(){
                if(this.duringMove){
                    this.duringMove = false;
                    this.setState(this.sMove);
                }
                else{
                    var def2 = this.enemyAttack();
                    def2.then(dojo.hitch(this,function(){
                        this.setState(this.sFight);
                    }));
                }
            }));
        }));
    },

    /*******************************************************************
     *
     * Used for example after defeating an enemy or searching a location
     * for items. Finds any items that are better than current from
     * items (for example a stronger weapon/0, then ask player whether
     * to take or not. Items such as gold and special are automatically
     * given to the player without asking.
     *
     ******************************************************************/
    examineItems: function(items, foundSaying){
        this.offerSaying = foundSaying;
        var deferred = new dojo.Deferred();
        this.setState(this.sOff);
        var atLeastOne = false;
        var gameEnd = false;
        dojo.some(items, dojo.hitch(this,function(item, indx){
            atLeastOne = true;
            if(item.iName == "crown"){
                gameEnd = true;
                return false; //break out of loop
            }
            switch(item.iType){
                case dojo.global.WEAPON:
                    if((this.player.weapon == null) || (item.iValue >= this.player.weapon.iValue)){
                        this.potentialItems.push(item);
                    }
                    break;
		        case dojo.global.ARMOR:
                    if((this.player.armor == null) || (item.iValue >= this.player.armor.iValue)){
                        this.potentialItems.push(item);
                    }
                    break;
                case dojo.global.POTION:
                    this._audio.play({url: "sounds/general/"+ this.equip, channel: 'speech'});
                    this._audio.say({text: foundSaying + " " + item.iName + " level " + item.iValue, channel: 'speech'});
                    this.player.addItem(item);
                    break;
                case dojo.global.GOLD:
                    this._audio.play({url: "sounds/general/"+ this.equip, channel: 'speech'});
                    this._audio.say({text: foundSaying + " " + item.iValue + " gold pieces!" , channel: 'speech'});
                    this.player.addItem(item);
                    break;
                case dojo.global.SPECIAL:
                    this._audio.play({url: "sounds/general/"+ this.equip, channel: 'speech'});
                    this._audio.say({text: foundSaying + " " + item.iName, channel: 'speech'});
                    this.player.addItem(item);
                    break;
            }
            if(indx == (items.length - 1)){
                //setup for after offerItems() is done
                var offer = dojo.subscribe("offeringItems", dojo.hitch(this, function(message){
                    if (message == "done") {
                        dojo.unsubscribe(offer);
                        deferred.callback({found:true});
                    }
                }));
                this.offerItems();
            }
        }));
        if(gameEnd){
            console.log("AAAAAAAAAAAAHHH game end sequence missing");
        }
        if(!atLeastOne){
            deferred.callback({found:false});
        }
        return deferred;
    },

    /*******************************************************************
     *
     * Buy the selected item
     *
     ******************************************************************/
    _buyItem: function(){
        switch(this.vendor.Items[this.itemIndex].iType){
            case dojo.global.WEAPON:
                this._audio.say({text: "Purchasing this item will replace your current weapon, " + this.player.weapon.iName + " level " + this.player.weapon.iValue, channel:'speech'});
                this._audio.say({text: "Are you sure you want to replace it with " + this.vendor.Items[this.itemIndex].iName + " level " + this.vendor.Items[this.itemIndex].iValue, channel:'speech'});
                this.setState(this.sBuy);
            break;
            case dojo.global.ARMOR:
                this._audio.say({text: "Purchasing this item will replace your current armor, " + this.player.armor.iName + " level " + this.player.armor.iValue, channel:'speech'});
                this._audio.say({text: "Are you sure you want to replace it with " + this.vendor.Items[this.itemIndex].iName + " level " + this.vendor.Items[this.itemIndex].iValue, channel:'speech'});
                this.setState(this.sBuy);
            break;
            default:
                this._audio.say({text: "Are you sure you want to purchase " + this.vendor.Items[this.itemIndex].iName + " level " + this.vendor.Items[this.itemIndex].iValue , channel:'speech'});
                this.setState(this.sBuy);
        }
    },

    /*
        Read the original menu instructions
    */
    readMenu: function(){
        this._readingInstructions = true;
        var def = this.fadeChannel('music');
        def.then(dojo.hitch(this, function(){
            this.setState(this.sListen);
            this._audio.play({url: "sounds/general/"+ this.dirSpac, channel:'sound'});
            dojo.forEach([this.dirChar, this.dirItem, this.dirLoca, this.dirEnem,   this.dirSave, this.dirQuit, this.instruct], dojo.hitch(this, function(sound){
                this._audio.play({url: "sounds/general/" + sound, channel:'sound'}); 
            }));
            this._audio.play({url: "sounds/general/"+ this.menu, channel:'sound'})
                .anyAfter(dojo.hitch(this,function(){
                    //start background when done
                    this._readingInstructions = false;
                    this._audio.play({url: "sounds/general/"+ this.theme, channel:'sound'});
                    this.setState(this.sMenu);
                }));
        }));
    },

    /*******************************************************************
     *
     * fade out and stop channel
     *
     ******************************************************************/
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

    /*******************************************************************
     *
     * Enemy attack sequence
     *
     ******************************************************************/
    enemyAttack: function(){
        this.setState(this.sOff);
        var deferred = new dojo.Deferred();
        //play action sound
        this._audio.play({url: "sounds/" + this.map.Name + ".sounds/" + this.map.sounds[this.enemy.ActionSound], channel: 'sound'})
        .anyAfter(dojo.hitch(this, function(){
            var randS = Math.floor(Math.random()*(this.enemy.Strength+1));
            var total = randS + this.enemy.Strength - this.player.defense;
            if(total > 0){ //enemy hit successfully
                var def = this.player.updateHP(-total);
                def.then(dojo.hitch(this,function(result){
                    if(result.alive){
                        deferred.callback();
                    }
                    else{
                        this.setState(this.sOff);
                        var playerHas = _useElixir();
                        if(playerHas){
                            this.player.hp = this.player.maxHP;
                            deferred.callback();
                        }
                        else{
                            this._audio.stop({channel:'speech'});
                            this._audio.stop({channel:'music'});
                            this.player.stopAudio();
                            this._gameReset();
                            this._start();
                        }
                    }
                }));
            }
            else{ //miss
                this._audio.say({text: "The " + this.enemy.Name + " failed. in its attack.", channel: 'speech'})
                    .anyAfter(dojo.hitch(this, function(){    
                        deferred.callback();
                    }));
            }
        }));
        return deferred;
    },

    /*******************************************************************
     *
     * See if player has the undead elixir, if so remove
     *
     ******************************************************************/
    _useElixr:function(){
        var foundElixir = false;
        var eIdx = -1;
        var eSoundIdx = -1;
        dojo.some(this.player.specialItems, dojo.hitch(this,function(item, index){
            if(item.iName == "undead elixir")
            {
                foundElixir = true;
                eIdx = index;
                eSoundIdx = item.iActionSound;
                return false;
            }
        }));
        if(foundElixir){
            this._audio.stop({channel:'speech'});
            this._audio.play({url: "sounds/" + this.map.Name + ".sounds/" + this.map.sounds[eSoundIdx], channel: 'sound'});
            this.player.specialItems.splice(eIdx,1);
        }
        return foundElixir;
    },
    
    /*******************************************************************
     *
     * Player attack sequence
     *
     ******************************************************************/
    playerAttack: function(){
        var deferred = new dojo.Deferred();
        this.setState(this.sOff);
        this._audio.play({url: "sounds/" + this.map.Name + ".sounds/" + this.map.sounds[this.player.weapon.iActionSound], channel: 'sound'})
        .anyAfter(dojo.hitch(this, function(){
            var randS = Math.floor(Math.random()*(this.player.strength+1));
            var total = randS + this.player.strength - this.enemy.Defense;
            if(total > 0){ //successful
                this.enemy.HP-=total;
                if(this.enemy.HP <= 0){
                    this.fadeChannel('music');
                    var enemyName = this.enemy.Name;
                    this._audio.say({text: "Successful attack! You have vanquished the " + enemyName, channel: 'speech'})
                        .anyAfter(dojo.hitch(this,function(){
                            deferred.callback({vanquished:true});
                        }));
                }
                else{
                    if(this.enemy.HP==1){
                        this._audio.say({text: "Successful attack! You have weakened the enemy to " + this.enemy.HP + "hit point.", channel:'speech'})
                        .anyAfter(dojo.hitch(this,function(){
                            deferred.callback({vanquished:false});
                        }));
                    }
                    else{
                        this._audio.say({text: "Successful attack! You have weakened the enemy to " + this.enemy.HP + "hit points.", channel: 'speech'})
                        .anyAfter(dojo.hitch(this,function(){
                            deferred.callback({vanquished:false});
                        }));
                    }
                }
            }
            else{ //miss
                this._audio.say({text: "You failed to hit the enemy.", channel:'speech'})
                    .anyAfter(dojo.hitch(this,function(){
                        deferred.callback({vanquished:false});
                    }));
            }
        }));
        return deferred;
    },

    /*******************************************************************
     *
     * Sets this.state and also publishes to change on screen directions
     * On screen directions need to be improved
     *
     ******************************************************************/
    setState:function(state){
        //console.log(arguments.callee.caller.toString(), "With state: " + this.state);
        this.state = state;
        dojo.publish("stateStatus", [state]);
    },

    /*******************************************************************
     *
     * Give player option of swapping items, one at a time. Used for
     * giving player option whether to keep items found during search
     * or recovered from an enemy
     *
     ******************************************************************/
    offerItems: function(){
        if(this.potentialItems.length > 0 ){
            this.setState(this.sOff);
            var playerItem;
            if(this.potentialItems[0].iType == dojo.global.WEAPON){
                playerItem = this.player.weapon;
            }
            else{
                playerItem = this.player.armor;
            }
            this._audio.say({text: this.offerSaying + " a level " + this.potentialItems[0].iValue + " " + this.potentialItems[0].iName, channel: 'speech'});
            if(playerItem == null){
                //remove and give, no choice
                this.tempItem = this.potentialItems.splice(0,1)[0];
                this._audio.play({url: "sounds/general/"+ this.equip, channel: 'speech'});
                this._audio.say({text: this.tempItem.iName + " equipped.", channel: 'speech'});
                this.player.addItem(this.tempItem);
                this.tempItem = null;
                this.offerItems(); 
            }
            else{
                this._audio.say({text: "Would you like to replace your level " + playerItem.iValue + " " + playerItem.iName + " with it?", channel: 'speech'})
                    .anyAfter(dojo.hitch(this,function(){
                        //remove item
                        this.tempItem = this.potentialItems.splice(0,1)[0];
                        this.setState(this.sAddItem);
                    }));
            }
        }
        else{
            dojo.publish("offeringItems", ["done"]);
        }
    },
    
    /*******************************************************************
     *
     * Decides what to do given a success value of whether the player
     * was allowed to move. See map._getNeighbor() for reason why a move
     * could fail
     *
     ******************************************************************/
    moveResult: function(result){
        if(result){
            this._audio.stop({channel:'speech'});
            this.skipVendors = false;
            this.skipFriends = false;
            this.skipLep = false;
            this.exploreNode();
        }
        else{
            console.log("Name: ", this.player.missingItemName);
            if(this.player.tooWeak){
                this.player.tooWeak = false;
                this._audio.stop({channel: "speech"});
                this._audio.say({text: "You are not strong enough to move down this passage. Come back when you have greater strength.", channel : "speech"})
                this.setState(this.sMove);
            }
            else if(this.player.missingItemName!=null){
                this._audio.stop({channel: "speech"});
                this._audio.say({text: "You need the " + this.player.missingItemName + " to proceed down this path. Come back when you have found it.", channel : "speech"})
                this.player.missingItemName = null;
                this.setState(this.sMove);
            }
            else{
                this._audio.stop({channel: "speech"});
                this._audio.play({url: "sounds/noMove", channel : "sound"})
                .anyAfter(dojo.hitch(this,function(){
                    this.setState(this.sMove);            
                }));
            }
        }
    },

    /*******************************************************************
     *
     * Sequence following a successful move
     *
     ******************************************************************/
    exploreNode: function(){
        console.log(this.map.nodes[this.map.currentNodeIndex]);
        this.map.visitCurrentNode();
        this.enemyData = this.map.getNPC(dojo.global.ENEMY);
        this.vendorData = this.map.getNPC(dojo.global.VENDOR);
        this.friendData = this.map.getNPC(dojo.global.FRIEND);
        this.lepData = this.map.getNPC(dojo.global.LEPRECHAUN);
        /*
         * -1 is a sentenel value. Meaning there is no such NPC. 
         * If the NPC exists, the second entry of the array returned
         * by this.map.getNPC() will be the index of the NPC in the 
         * current node's NPC array. Necessary for removing at a later
         * time if defeated or the like
         * */
        if(this.enemyData[1] != -1)
        {
            this.enemy = this.enemyData[0];
            var def = this.map.fade();
            def.then(dojo.hitch(this, function(){
                this._audio.play({url: "sounds/general/"+ this.fightsong, channel: 'music'});
                this._audio.say({text: "You have encountered a " + this.enemy.Name + ".", channel:'speech'});

                //read stats
                this._audio.say({text: "Its strength is " + this.enemy.Strength + ".", channel:'speech'});
                this._audio.say({text: "Its defense is " + this.enemy.Defense + ".", channel:'speech'});
                if(this.enemy.HP == 1){
                    this._audio.say({text: "It has " + this.enemy.HP + " hit point.", channel:'speech'});
                }
                else{
                    this._audio.say({text: "It has " + this.enemy.HP + " hit points.", channel:'speech'});
                }

                //option to run
                this._audio.say({text: "Do you want to try to run away?", channel:'speech'});

                //don't actually need to wait for all to be read, just make sure all have been queued up
                this.setState(this.sRun);
            }));
        }
        else if ((this.vendorData[1] != -1) && !this.skipVendors){
            this.vendor = this.vendorData[0];
            this._audio.say({text: "Welcome to " + this.vendor.Name, channel: 'speech'});
            this._audio.say({text: "Would you like to purchase some items today?", channel:'speech'});
            this.setState(this.sVendor);
        }
        else if((this.friendData[1] != -1) && !this.skipFriends){
            this.friend = this.friendData[0];
            //force to talk
            if(this.firstFriend){
                this.firstFriend = false;
                this.setState(this.sOff);
                this._audio.stop({channel:'speech'});
                this.player.stopAudio();
                //play sound and give all items to player
                this._audio.play({url: "sounds/" + this.map.Name + ".sounds/" + this.map.sounds[this.friend.ActionSound], channel: 'speech'})
                    .anyAfter(dojo.hitch(this,function(){
                        var def = this.examineItems(this.friend.Items, this.friend.Name+ "has given you ");
                        def.then(dojo.hitch(this,function(){
                            this.setState(this.sOff);
                            //remove friend or what??
                            this.map.removeNPC(this.friendData[1]);
                            this.friend = null;
                            this.exploreNode();
                        }));
                    }));
                this.setState(this.sListen);
            }
            else{
                this._audio.say({text: "You have run into a friend. Would you like to talk to " +  this.friend.Name, channel: 'speech'});
                this.setState(this.sFriend);
            }
        }
        else if((this.lepData[1] != -1) && !this.skipLep){
            this._audio.say({text: "You have encountered a leprekaun.", channel: 'speech'})
            .anyAfter(dojo.hitch(this,function(){
                this._audio.play({url: "sounds/general/" + this.lepplay, channel: 'speech'})
                this.setState(this.sLepEncounter);
            }));
        }								
        else{
            this.setState(this.sMove);
        }
    },
    
    /*******************************************************************
     *
     * randomizes an array
     *
     ******************************************************************/
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

    /*******************************************************************
     *
     * Determines how risky a battle is and informs the player of this.
     * A query is prompted by the user during battle with 'Q' button.
     *
     ******************************************************************/
    _queryEnemy: function(){
        if(!this.enemy) return;
        var factor = this.enemy.Defense/(this.player.strength*2);
        if(factor >= .75) {
            this._audio.say({text:"This is a risky battle.", channel:'speech'});
        }
        else if(factor >= .35){
            this._audio.say({text:"This is a fair battle.", channel:'speech'});
        }
        else{
            this._audio.say({text:"This is an easy battle.", channel:'speech'});
        }
    },

    _stopAudio: function(){
        this._audio.stop({channel:'sound'});
        this._audio.stop({channel:'music'});
        this._audio.stop({channel:'speech'});
        this.player.stopAudio();
    },
});

dojo.ready(function() {
    var app = new main();        
});
