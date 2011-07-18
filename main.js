/**************************************************************************
*
* TheLastCrusade -- developed for HarkTheSound.org by Robert Overman
*
* From the original Win version:
* http://www.cs.unc.edu/Research/assist/et/projects/RPG/TheLastCrusade.htm
*
***************************************************************************/
/*  @TODO: Add in too soon click for space bar?*/
/*  @TODO: Sell back items -> need for primary and secondary weapons??*/

dojo.provide('main');
dojo.require('dojo.parser');
dojo.require('dojo.hash');
dojo.require('dojox.timing');
dojo.require('widgets.map');
dojo.require('widgets.player');

dojo.declare('main', null, {
    constructor: function() {
        dojo.global.WEAPON = 0;
        dojo.global.ARMOR = 1;
        dojo.global.POTION = 2;
        dojo.global.GOLD = 3;
        dojo.global.SPECIAL = 4;

        //state
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
                this.directions.innerHTML = "Y: Yes, run away <br> N: No, stay and fight";
                break;
            case this.sListen:
                this.directions.innerHTML = "F: Skip";
                break;
            case this.sAddItem:
                this.directions.innerHTML = "Y: Yes, add item <br> N: No, discard item";
                break;
            case this.sPotionCycle:
                this.directions.innerHTML = "Use the left and right arrow keys to cycle through the potions.";
                break;
            case this.sPotionChoice:
                this.directions.innerHTML = "A: Accept, use potion <br> Left/Right Arrow: Choose Another";              
                break;
            case this.sVendor:
                this.directions.innerHTML = "Y: Yes check out inventory <br> N: No, I don't want to buy anything";
                break;
            case this.sVendorScroll:
                this.directions.innerHTML = "B: Buy item <br> Left/Right Arrow: Choose Another <br> Escape: Return to game";              
                break;   
            case this.sBuy:
                this.directions.innerHTML = "Y: Yes, buy item <br> N: No, continue looking";         
                break;
            case this.sFriend:
                this.directions.innerHTML = "Y: Talk to friend <br> N: Do not talk to friend";
                break;
            case this.sLepEncounter:
                this.directions.innerHTML = "Y: Play the leprechaun's game <br> N: Refuse to play";
                break;
            case this.sLepGame:
                this.directions.innerHTML = "Press 1,2 or 3 to play <br> Press 'A' to attempt to kill the leprechaun.";
                break;
            case this.sLepAgain:
                this.directions.innerHTML = "Y: Play again <br> N: Don't play again";
                break;
            }
        })); 
        var def = uow.getAudio({defaultCaching: true});    //get JSonic
        def.then(dojo.hitch(this, function(audio) { 
            this._audio = audio;
            this._initSounds();
            dojo.connect(dojo.global, 'onkeyup', dojo.hitch(this, '_removeKeyDownFlag'));
            dojo.connect(dojo.global, 'onkeydown', dojo.hitch(this, '_analyzeKey'));     
            this._keyHasGoneUp = true;
            this._start();
        }));           
    },
    
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

    /*
        begin gameplay
    */
    _start: function(){
        this.mapList = ["forest.json", "graveyard.json", "castle.json"];
        this.player = new widgets.player({}, null); 
        this._audio.play({url: 'sounds/general/' + this.title, channel:'main'});
        this._audio.setProperty({name: 'loop', channel: 'background', value: true});
        this._audio.play({url: "sounds/general/"+ this.theme, channel: 'background'});
        this._audio.play({url: "sounds/general/" + this.menu, channel: 'main'});
        this.setState(this.sMenu);            
    },

    /*
        Load the map and visit the first node
        Also sets up how to handle game widget destruction
    */
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
            this.map = new widgets.map({mapData: data}, null); 
            if(this.start){
                this.start = false;
            }
            else{
                this.player.equipWeakItems(this.map);
            }
            this._audio.say({text: "You are now entering the " + this.map.Name})
                .anyAfter(dojo.hitch(this,function(){
                    this.setState(this.sMove);
                    this.exploreNode();
                }));   
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
        setup all sound names from original game, most will eventually be deleted
    */
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
    
    /*
        Analyze user input given the state of the game
    */
    _analyzeKey: function(evt){
        if (this._keyHasGoneUp) {
            console.log("Game state: " , this.state);
            console.log("enemy: ", this.enemy);
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
                                this.player.stopAudio();
                                this.fadeChannel('background');
                                this._audio.stop({channel:'main'});
                                this.player.readStats();
                                //don't need to wait through all of stats
                                this.setState(this.sMove);                              
                                break;    
                            case 83: //search for items
                                this.setState(this.sOff);
                                this.player.stopAudio();
                                this._audio.stop({channel:'main'});
                                var def = this.examineItems(this.map.nodes[this.map.currentNodeIndex].Items, "You found ");
                                def.then(dojo.hitch(this,function(result){
                                    if(result.found){
                                        //empty item array
                                        this.map.nodes[this.map.currentNodeIndex].Items = new Array();
                                        this.setState(this.sMove);               
                                    }
                                    else{
                                        this._audio.say({text:"You did not find any items."});
                                        this.setState(this.sMove);        
                                    }
                                }));

                                break;
                            case 68: //query directions
                                this.setState(this.sOff);
                                this.player.stopAudio();
                                this._audio.stop({channel:'main'});
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
                                    this._audio.say({text: "The " + stringArr[0] + " passage is open.", channel: 'main'});
                                }
                                else{
                                    this._audio.say({text: " The ", channel: 'main'});
                                    dojo.forEach(stringArr, dojo.hitch(this,function(dir, idx){
                                        if(idx == (stringArr.length -1)){
                                            this._audio.say({text: " and ", channel: 'main'});
                                        }
                                        this._audio.say({text: dir, channel: 'main'});
                                    }));
                                    this._audio.say({text:" passages are open.", channel: 'main'});
                                }
                                this.setState(this.sMove);                                
                                break;
                            case 80: //P: use potion if available
                                    this.setState(this.sOff);
                                    this.player.stopAudio();
                                    if(this.player.potions.length != 0){
                                        this._audio.say({text:"Use the left and right arrow keys to cycle through the potions.", channel: "main"});
                                        this.duringMove = true;
                                        this.setState(this.sPotionCycle);   
                                    }
                                    else{
                                        this._audio.say({text:"You do not have any potion.", channel: "main"})
                                        .anyAfter(dojo.hitch(this,function(){
                                            this.setState(this.sMove);
                                        }));
                                    }
                                break;
                        }
                        break;
                    case this.sMenu:
                        switch(evt.keyCode){
                            // 3 to read the menu
                            case dojo.keys.NUMPAD_3:
                            case 51:
                                this.setState(this.sOff);
                                this.fadeChannel('main');
                                this.readMenu();
                                break;
                            // 1 to start new game
                            case dojo.keys.NUMPAD_1:
                            case 49:
                                this.setState(this.sOff);
                                var d1 = this.fadeChannel('background');
                                d1.then(dojo.hitch(this, function(){
                                    var def3 = this.fadeChannel('main')
                                    return def3;
                                })).then(dojo.hitch(this, function(){
                                    this.setState(this.sListen);
                                    this._audio.play({url: 'sounds/general/' + this.story, channel: 'main'})
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
                                    this._audio.say({text: "Your attempt to run away has failed. You must continue to fight the " + this.enemy.Name})
                                        .anyAfter(dojo.hitch(this, function(){
                                            var def = this.enemyAttack();
                                            def.then(dojo.hitch(this,function(){
                                                this.setState(this.sFight);
                                            }));
                                        }));
                                }
                                else{//success
                                    this.fadeChannel("background");
                                    this._audio.say({text: "You have abandoned the fight and returned to your previous location."});

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
                                    this._audio.say({text:"Use the left and right arrow keys to cycle through the potions.", channel: "main"});
                                    this.setState(this.sPotionCycle);   
                                }
                                else{
                                    this._audio.say({text:"You do not have any potion.", channel: "main"})
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
                            case 83:
                                this.player.hp = 0;
                                break;
                        }  
                        break;
                    case this.sRun:
                        switch(evt.keyCode){
                            case 89: //Y
                                this.setState(this.sOff);
                                this._audio.stop({channel: "main"});
                                var randZeroTo99=Math.floor(Math.random()*100);
                                if(randZeroTo99 > this.enemy.RunPerc){ //fail
                                    this._audio.say({text: "Your attempt to run away has failed. You must now fight the " + this.enemy.Name})
                                        .anyAfter(dojo.hitch(this, function(){
                                            var def = this.enemyAttack();
                                            def.then(dojo.hitch(this,function(){
                                                this.setState(this.sFight);
                                            }));
                                        }));
                                }
                                else{//success
                                    this.fadeChannel("background");
                                    this._audio.say({text: "You have avoided the " + this.enemy.Name + " and returned to your previous location."});

                                    this.enemy = null;
                                    var def = this.map.returnPrevious();
                                    def.then(dojo.hitch(this,function(){
                                        this.setState(this.sMove);
                                    }));
                                }
                            break;
                            case 78: //N
                                this.setState(this.sOff);
                                this._audio.stop({channel: "main"});
                                //enemy should also attack
                                this._audio.say({text: "You have chosen to stand your ground."})
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
                            this._audio.stop({channel: 'main'});
                            if(this._readingInstructions){
                                this._readingInstructions = false;
                                this._audio.play({url: "sounds/general/"+ this.theme, channel:'main'});
                                this.setState(this.sMenu);
                            }
                            break;
                        }
                        break;
                    case this.sAddItem:
                        switch(evt.keyCode){
                            case 89: //Y
                                this.setState(this.sOff);
                                this._audio.play({url: "sounds/general/"+ this.equip, channel: 'main'});
                                this._audio.say({text: this.tempItem.iName + " equipped.", channel: 'main'});
                                this.player.addItem(this.tempItem);
                                this.tempItem = null;
                                this.offerItems();                                
                            break;
                            case 78: //N
                                this.setState(this.sOff);
                                this.tempItem = null;
                                this.offerItems();   
                            break;
                        }
                        break;
                    case this.sPotionCycle:
                        switch(evt.keyCode){
                            case dojo.keys.LEFT_ARROW:
                                this.setState(this.sOff);
                                this._audio.stop({channel:'main'});
                                if(--this.potionIndex < 0){
                                    this.potionIndex = (this.player.potions.length - 1);
                                }
                                break;
                            case dojo.keys.RIGHT_ARROW:
                                this.setState(this.sOff);
                                this._audio.stop({channel:'main'});
                                if(++this.potionIndex >= this.player.potions.length){
                                    this.potionIndex = 0;
                                }
                                break;
                        }
                        this._audio.say({text: this.player.potions[this.potionIndex].iName + "level " + this.player.potions[this.potionIndex].iValue, channel: "main"});
                        this.setState(this.sPotionChoice);
                        break; 
                    case this.sPotionChoice:
                        switch(evt.keyCode){
                            case dojo.keys.LEFT_ARROW:
                                this.setState(this.sOff);
                                this._audio.stop({channel:'main'});
                                if(--this.potionIndex < 0){
                                    this.potionIndex = (this.player.potions.length - 1);
                                }
                                this._audio.say({text: this.player.potions[this.potionIndex].iName + "level " + this.player.potions[this.potionIndex].iValue, channel: "main"});
                                this.setState(this.sPotionChoice);
                                break;
                            case dojo.keys.RIGHT_ARROW:
                                this.setState(this.sOff);
                                this._audio.stop({channel:'main'});
                                if(++this.potionIndex >= this.player.potions.length){
                                    this.potionIndex = 0;
                                }
                                this._audio.say({text: this.player.potions[this.potionIndex].iName + "level " + this.player.potions[this.potionIndex].iValue, channel: "main"});
                                this.setState(this.sPotionChoice);
                                break;
                            case 65: //A
                                this.setState(this.sOff);
                                this._audio.stop({channel:'main'});
                                this._usePotion();                           
                            break;
                        }
                        break; 
                    case this.sVendor:
                        switch(evt.keyCode){
                            case 89: //Y
                                this.setState(this.sOff);
                                this._audio.stop({channel:'main'});
                                this.player.stopAudio();
                                this._audio.say({text: "You currently have " + this.player.gold + " gold.", channel:'main'});
                                this._audio.say({text: "Use the arrow keys to cycle through the options and press bee to select a purchase. Press escape to return to the game.", channel:'main'});
                                this.setState(this.sVendorScroll);
                            break;
                            case 78: //N
                                this.setState(this.sOff);
                                this._audio.stop({channel:'main'});
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
                                this._audio.stop({channel:'main'});
                                if(--this.itemIndex < 0){
                                    this.itemIndex = (this.vendor.Items.length - 1);
                                }
                                this._audio.say({text: this.vendor.Items[this.itemIndex].iName + "price " + this.vendor.Items[this.itemIndex].iValue + " gold.", channel: "main"});
                                this.setState(this.sVendorScroll);
                                break;
                            case dojo.keys.RIGHT_ARROW:
                                this.setState(this.sOff);
                                this._audio.stop({channel:'main'});
                                if(++this.itemIndex >= this.vendor.Items.length){
                                    this.itemIndex = 0;
                                }
                                this._audio.say({text: this.vendor.Items[this.itemIndex].iName + "price " + this.vendor.Items[this.itemIndex].iValue + " gold.", channel: "main"});
                                this.setState(this.sVendorScroll);
                                break;
                            case 66: //B
                                this.setState(this.sOff);
                                this._audio.stop({channel:'main'});
                                this._buyItem();                           
                                break;
                            case dojo.keys.ESCAPE:
                                this.setState(this.sOff);
                                this._audio.stop({channel:'main'});
                                this.player.stopAudio();
                                this.skipVendors = true;
                                this.vendor = null;
                                this.exploreNode();
                                break;
                        }
                    break;
                    case this.sBuy:
                        switch(evt.keyCode){
                            case 89: //Y
                                this.setState(this.sOff);
                                this._audio.stop({channel:'main'});
                                if(this.player.gold < this.vendor.Items[this.itemIndex].iValue){
                                    this._audio.say({text:"You cannot afford this item.", channel:'main'});
                                    this.setState(this.sVendorScroll);
                                }
                                else{
                                    this._audio.play({url: "sounds/general/"+ this.equip, channel: 'main'});
                                    this.player.addItem(dojo.clone(this.vendor.Items[this.itemIndex]));
                                    //take away gold
                                    this.player.gold-= this.vendor.Items[this.itemIndex].iValue;
                                    if(this.vendor.Items[this.itemIndex].iType != dojo.global.POTION){
                                        this.vendor.Items.splice(this.itemIndex, 1);
                                    }
                                    this.itemIndex = 0;
                                    
                                    if(this.vendor.Items.length == 0){
                                        this._audio.say({text: "That was the last item in our inventory. Thank you for your business.", channel: 'main'})
                                        .anyAfter(dojo.hitch(this,function(){
                                            //remove vendor
                                            this.map.removeNPC(this.vendorData[1]);                                        
                                            this.vendor = null;
                                            this.exploreNode();
                                        }));
                                    }
                                    else{
                                        this._audio.say({text: "You currently have " + this.player.gold + " gold.", channel:'main'});
                                        this._audio.say({text: "Use the arrow keys to cycle through the options and press bee to select a purchase. Press escape to return to the game.", channel:'main'});
                                        this.setState(this.sVendorScroll);
                                    }
                                }
                                
                            break;
                            case 78: //N
                                this.setState(this.sOff);
                                this._audio.stop({channel:'main'});
                                this._audio.say({text: "You currently have " + this.player.gold + " gold.", channel:'main'});
                                this._audio.say({text: "Use the arrow keys to cycle through the options and press bee to select a purchase. Press escape to return to the game.", channel:'main'});
                                this.setState(this.sVendorScroll);
                            break;
                        }
                    break;
                    //have to fill up an array, go through it one by one and callback when all done
                    case this.sFriend:
                        switch(evt.keyCode){
                            case 89: //Y
                                this.setState(this.sOff);
                                this._audio.stop({channel:'main'});
                                this.player.stopAudio();
                                //play sound and give all items to player
                                this._audio.play({url: "sounds/" + this.map.Name + ".sounds/" + this.map.sounds[this.friend.ActionSound], channel: 'main'})
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
                            case 78: //N
                                this.setState(this.sOff);
                                this._audio.stop({channel:'main'});
                                this.player.stopAudio();
                                this.skipFriends = true;
                                this.friend = null;
                                this.exploreNode();
                            break;
                        }                    
                    break;
                    case this.sLepEncounter:
                        switch(evt.keyCode){
                            case 89: //Y
                                this.setState(this.sOff);
                                this._audio.stop({channel:'main'});
                                this.player.stopAudio();
                                if(this.player.gold < 50){
                                    this._audio.play({url: "sounds/general/" + this.lepmore, channel:'main'});
                                    this.skipLep = true;
                                    this.lepData = null;
                                    this.exploreNode();
                                }
                                else{
                                    this._audio.play({url: "sounds/general/" + this.leprules, channel: 'main'});
                                    this.startLepGame();
                                }
                            break;
                            case 78: //N
                                this.setState(this.sOff);
                                this._audio.stop({channel:'main'});
                                this.player.stopAudio();
                                this.skipLep = true;
                                if(Math.floor(Math.random()*(2)) > 0){
                                    this._audio.play({url: "sounds/general/" + this.lepmad, channel: 'main'});
                                    this.player.halfGold();
                                    this._audio.say({text: "The leprekaun has run away and taken half of your gold with him.", channel: 'main'});
                                    this._audio.say({text: "You now have " + this.player.gold + " gold pieces.", channel: 'main'})
                                        .anyAfter(dojo.hitch(this,function(){
                                            this.exploreNode();
                                        }));
                                }
                                else{
                                    this._audio.play({url: "sounds/general/" + this.lepgood, channel: 'main'})
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
                                this._audio.stop({channel:'main'});
                                this.player.stopAudio();
                                this.lepResponse(this.lepArray[0]);
                                break;
                            case dojo.keys.NUMPAD_2:
                            case 50:
                                this.setState(this.sOff);
                                this._audio.stop({channel:'main'});
                                this.player.stopAudio();
                                this.lepResponse(this.lepArray[1]);                            
                                break;
                            case dojo.keys.NUMPAD_3:
                            case 51:
                                this.setState(this.sOff);
                                this._audio.stop({channel:'main'});
                                this.player.stopAudio();
                                this.lepResponse(this.lepArray[2]);
                                break;
                                
                            case 65: //attack
                                this.setState(this.sOff);
                                this._audio.stop({channel:'main'});
                                this.player.stopAudio();
                                if(Math.floor(Math.random()*(2))==0){//killed
                                    this._audio.play({url: 'sounds/general/' + this.lepdie, channel: 'main'});
                                    var def = this.examineItems(this.lepData[0].Items, "You took ");
                                    def.then(dojo.hitch(this,function(){                                          
                                        this.map.removeNPC(this.lepData[1]);
                                        this.lepData = null;
                                        this.exploreNode();
                                    }));
                                }
                                else{//fail
                                    this._audio.play({url: 'sounds/general/' + this.leplive, channel: 'main'});
                                    this.player.halfHealth();
                                    this.player.removePotions();
                                    if(this.player.hp == 1){
                                        this._audio.say({text: "You now have " + this.player.hp + " hit point and no potions.", channel: 'main'});
                                    }
                                    else{
                                        this._audio.say({text: "You now have " + this.player.hp + " hit points and no potions.", channel: 'main'});
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
                         case 89: //Y
                            this.setState(this.sOff);
                            this._audio.stop({channel:'main'});
                            this.player.stopAudio();
                            this.startLepGame();
                            break;
                         case 78: //N
                            this.setState(this.sOff);
                                this._audio.stop({channel:'main'});
                                this.player.stopAudio();
                            this._audio.play({url: 'sounds/general/' + this.lepbye, channel: 'main'});
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
    
    startLepGame: function(){
    this._audio.play({url: "sounds/general/" + this.lep123, channel: 'main'});
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
    
    /*
     * Sequence after player has chosen 1-3 during lep game
     * */
    lepResponse: function(choice){
        this.player.gold+=choice;
        if(choice > 0){ //win
            this._audio.play({url: 'sounds/general/' + this.lepwin, channel: 'main'});
        }
        else{ //lose
            this._audio.play({url: 'sounds/general/' + this.leplose, channel: 'main'});
        }
        this._audio.say({text: "You now have " + this.player.gold + " gold pieces.", channel: 'main'});
        
        if(this.player.gold < 50){
            this._audio.play({url: "sounds/general/" + this.lepmore, channel:'main'});
            this.skipLep = true;
            this.lepData = null;
            this.exploreNode();
        }
        else{
            this._audio.play({url: 'sounds/general/' + this.lepagain, channel: 'main'});
            this.setState(this.sLepAgain);
        }
    },
    
    /*
        Use the potion selected
    */
    _usePotion:function(){
        this._audio.play({url: 'sounds/general/potion_a', channel:'main'})
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

    /*
        Find any items that are better than current from items, then ask player whether to take
    */
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
                    this._audio.play({url: "sounds/general/"+ this.equip, channel: 'main'});
                    this._audio.say({text: foundSaying + " " + item.iName + " level " + item.iValue, channel: 'main'});
                    this.player.addItem(item);
                    break;
                case dojo.global.GOLD:
                    this._audio.play({url: "sounds/general/"+ this.equip, channel: 'main'});
                    this._audio.say({text: foundSaying + " " + item.iValue + " gold pieces!" , channel: 'main'});
                    this.player.addItem(item);
                    break;
                case dojo.global.SPECIAL:
                    this._audio.play({url: "sounds/general/"+ this.equip, channel: 'main'});
                    this._audio.say({text: foundSaying + " " + item.iName + " level " + this.iValue, channel: 'main'});
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

    /*
        Buy the selected item
    */
    _buyItem: function(){
        switch(this.vendor.Items[this.itemIndex].iType){
            case dojo.global.WEAPON:
                this._audio.say({text: "Purchasing this item will replace your current weapon, " + this.player.weapon.iName + " level " + this.player.weapon.iValue, channel:'main'});
                this._audio.say({text: "Are you sure you want to replace it with " + this.vendor.Items[this.itemIndex].iName + " level " + this.vendor.Items[this.itemIndex].iValue, channel:'main'});
                this.setState(this.sBuy);
            break;
            case dojo.global.ARMOR:
                this._audio.say({text: "Purchasing this item will replace your current armor, " + this.player.armor.iName + " level " + this.player.armor.iValue, channel:'main'});
                this._audio.say({text: "Are you sure you want to replace it with " + this.vendor.Items[this.itemIndex].iName + " level " + this.vendor.Items[this.itemIndex].iValue, channel:'main'});
                this.setState(this.sBuy);
            break;
            default:
                this._audio.say({text: "Are you sure you want to purchase " + this.vendor.Items[this.itemIndex].iName + " level " + this.vendor.Items[this.itemIndex].iValue , channel:'main'});
                this.setState(this.sBuy);
        }
    },

    /*
        Read the original menu instructions
    */
    readMenu: function(){
        this._readingInstructions = true;
        var def = this.fadeChannel('background');
        def.then(dojo.hitch(this, function(){
            this.setState(this.sListen);
            this._audio.play({url: "sounds/general/"+ this.dirSpac, channel:'main'});
            dojo.forEach([this.dirChar, this.dirItem, this.dirLoca, this.dirEnem,   this.dirSave, this.dirQuit, this.instruct], dojo.hitch(this, function(sound){
                this._audio.play({url: "sounds/general/" + sound, channel:'main'}); 
            }));
            this._audio.play({url: "sounds/general/"+ this.menu, channel:'main'})
                .anyAfter(dojo.hitch(this,function(){
                    //start background when done
                    this._readingInstructions = false;
                    this._audio.play({url: "sounds/general/"+ this.theme, channel:'main'});
                    this.setState(this.sMenu);
                }));
        }));
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
        Enemy attack player
    */
    enemyAttack: function(){
        this.setState(this.sOff);
        var deferred = new dojo.Deferred();
        //play action sound
        this._audio.play({url: "sounds/" + this.map.Name + ".sounds/" + this.map.sounds[this.enemy.ActionSound], channel: 'enemy'})
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
                        this._audio.stop({channel:'main'});
                        this._audio.stop({channel:'background'});
                        this.player.stopAudio();
                        this._gameReset();
                        this._start();
                    }
                }));
            }
            else{ //miss
                this._audio.say({text: "The " + this.enemy.Name + " failed. in its attack."})
                    .anyAfter(dojo.hitch(this, function(){    
                        deferred.callback();
                    }));
            }
        }));
        return deferred;
    },

    /*
        Player attack enemy
    */
    playerAttack: function(){
        var deferred = new dojo.Deferred();
        this.setState(this.sOff);
        this._audio.play({url: "sounds/" + this.map.Name + ".sounds/" + this.map.sounds[this.player.weapon.iActionSound], channel: 'enemy'})
        .anyAfter(dojo.hitch(this, function(){
            var randS = Math.floor(Math.random()*(this.player.strength+1));
            var total = randS + this.player.strength - this.enemy.Defense;
            if(total > 0){ //successful
                this.enemy.HP-=total;
                if(this.enemy.HP <= 0){
                    this.fadeChannel('background');
                    var enemyName = this.enemy.Name;
                    this._audio.say({text: "Successful attack! You have vanquished the " + enemyName})
                        .anyAfter(dojo.hitch(this,function(){
                            deferred.callback({vanquished:true});
                        }));
                }
                else{
                    if(this.enemy.HP==1){
                        this._audio.say({text: "Successful attack! You have weakened the enemy to " + this.enemy.HP + "hit point."})
                        .anyAfter(dojo.hitch(this,function(){
                            deferred.callback({vanquished:false});
                        }));
                    }
                    else{
                        this._audio.say({text: "Successful attack! You have weakened the enemy to " + this.enemy.HP + "hit points."})
                        .anyAfter(dojo.hitch(this,function(){
                            deferred.callback({vanquished:false});
                        }));
                    }
                }
            }
            else{ //miss
                this._audio.say({text: "You failed to hit the enemy."})
                    .anyAfter(dojo.hitch(this,function(){
                        deferred.callback({vanquished:false});
                    }));
            }
        }));
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

    /*
        Give player option of swapping items, one at a time
    */
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
            this._audio.say({text: this.offerSaying + " a level " + this.potentialItems[0].iValue + " " + this.potentialItems[0].iName, channel: 'main'});
            if(playerItem == null){
                //remove and give, no choice
                this.tempItem = this.potentialItems.splice(0,1)[0];
                this._audio.play({url: "sounds/general/"+ this.equip, channel: 'main'});
                this._audio.say({text: this.tempItem.iName + " equipped.", channel: 'main'});
                this.player.addItem(this.tempItem);
                this.tempItem = null;
                this.offerItems(); 
            }
            else{
                this._audio.say({text: "Would you like to replace your level " + playerItem.iValue + " " + playerItem.iName + " with it?", channel: 'main'})
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
    /*
        Decides what to do given a success value of whether the player was allowed to move
    */
    moveResult: function(result){
        if(result){
            this._audio.stop({channel:'main'});
            this.skipVendors = false;
            this.skipFriends = false;
            this.skipLep = false;
            this.exploreNode();
        }
        else{
            if(this.player.tooWeak){
                this.player.tooWeak = false;
                this._audio.stop({channel: "main"});
                this._audio.say({text: "You are not strong enough to move down this passage. Come back when you have greater strength.", channel : "main"})
                this.setState(this.sMove);
            }
            else{
                this._audio.stop({channel: "main"});
                this._audio.play({url: "sounds/noMove", channel : "main"})
                .anyAfter(dojo.hitch(this,function(){
                    this.setState(this.sMove);            
                }));
            }
        }
    },

    /*
        Sequence following a successful move
    */
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
                this._audio.play({url: "sounds/general/"+ this.fightsong, channel: 'background'});
                this._audio.setProperty({name : 'volume', value: 0.75, channel : 'background', immediate : true});
                this._audio.say({text: "You have encountered a " + this.enemy.Name + ".", channel:'main'});

                //read stats
                this._audio.say({text: "Its strength is " + this.enemy.Strength + ".", channel:'main'});
                this._audio.say({text: "Its defense is " + this.enemy.Defense + ".", channel:'main'});
                if(this.enemy.HP == 1){
                    this._audio.say({text: "It has " + this.enemy.HP + " hit point.", channel:'main'});
                }
                else{
                    this._audio.say({text: "It has " + this.enemy.HP + " hit points.", channel:'main'});
                }

                //option to run
                this._audio.say({text: "Do you want to try to run away?", channel:'main'});

                //don't actually need to wait for all to be read, just make sure all have been queued up
                this.setState(this.sRun);
            }));
        }
        else if ((this.vendorData[1] != -1) && !this.skipVendors){
            this.vendor = this.vendorData[0];
            this._audio.say({text: "Welcome to " + this.vendor.Name, channel: 'main'});
            this._audio.say({text: "Would you like to purchase some items today?", channel:'main'});
            this.setState(this.sVendor);
        }
        else if((this.friendData[1] != -1) && !this.skipFriends){
            this.friend = this.friendData[0];
            //force to talk
            if(this.firstFriend){
                this.firstFriend = false;
                this.setState(this.sOff);
                this._audio.stop({channel:'main'});
                this.player.stopAudio();
                //play sound and give all items to player
                this._audio.play({url: "sounds/" + this.map.Name + ".sounds/" + this.map.sounds[this.friend.ActionSound], channel: 'main'})
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
                this._audio.say({text: "You have run into a friend. Would you like to talk to " +  this.friend.Name});
                this.setState(this.sFriend);
            }
        }
        else if((this.lepData[1] != -1) && !this.skipLep){
            this._audio.say({text: "You have encountered a leprekaun.", channel: 'main'});
            this._audio.play({url: "sounds/general/" + this.lepplay, channel: 'main'})
            this.setState(this.sLepEncounter);
        }								
        else{
            this.setState(this.sMove);
        }
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

    _queryEnemy: function(){
        if(!this.enemy) return;
        var factor = this.enemy.Defense/(this.player.strength*2);
        if(factor >= .75) {
            this._audio.say({text:"This is a risky battle.", channel:'main'});
        }
        else if(factor >= .35){
            this._audio.say({text:"This is a fair battle.", channel:'main'});
        }
        else{
            this._audio.say({text:"This is an easy battle.", channel:'main'});
        }
    },
});

dojo.ready(function() {
    var app = new main();        
});
