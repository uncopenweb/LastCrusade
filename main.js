dojo.provide('main');
dojo.require('dojo.parser');
dojo.require('dojo.hash');
dojo.require('dojox.timing');
dojo.require('widgets.map');
dojo.require('widgets.player');
dojo.require('widgets.item');

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
        this.state = this.sOff;

        this._mapIndex = 0;
        this.map = null;
        this.enemy = null;
        this.keyDelay = 0;
        this.directions = dojo.byId("directions");
        var stateHandle = dojo.subscribe("stateStatus", dojo.hitch(this, function(message){
            switch (message){
            case this.sOff:
                break;
            case this.sMenu:
                this.directions.innerHTML = "1: New Game <br> 2: Resume Saved Game  <br> 3: Directions For Playing";
                break;
            case this.sMove:
                this.directions.innerHTML = "Up Arrow: Move North <br> Down Arrow: Move South <br> Right Arrow: Move East <br> Left Arrow: Move West ";
                break;
            case this.sFight:
                this.directions.innerHTML = "A: Attack <br> R: Attempt to Run Away <br> P:  <br> Q:  ";
                break;
            case this.sRun:
                this.directions.innerHTML = "Y: Yes <br> N: No";;
                break;
            case this.sListen:
                this.directions.innerHTML = "F: Skip";
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

    _start: function(){
        this.mapList = ["graveyard.json", "forest.json", "castle.json"];
        this.player = new widgets.player({}, null); 
        //start background and loop indefinitely 
        this._audio.setProperty({name: 'loop', channel: 'background', value: true});
        this._audio.play({url: "sounds/general/"+ this.theme, channel: 'background'});
        this._audio.play({url: "sounds/general/" + this.menu, channel: 'main'});
        this.setState(this.sMenu);            
    },

    //Load a map
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
            this.setState(this.sMove);
            this.player.equipWeakItems(this.map);
            this._audio.say({text: "You are now entering the " + this.map.Name})
                .anyAfter(dojo.hitch(this,function(){
                     this.setState(this.sMove);
                     this.map.visitCurrentNode();
                }));   
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

    _initSounds: function(){
        this.theme = "main_theme";			
	    this.title = "title";				
	    // Story										
	    this.story = "introduction";		
	    this.ending = "end_king";			
	    // Menu											
	    this.menu = "menu";					
	    this.nodata = "no_save_data";		
	    this.nocust = "no_save_custom";		
	    // Directions									
	    this.dirChar = "dir_characters";	
	    this.dirEnem = "dir_enemy";			
	    this.dirItem = "dir_items";			
	    this.dirLoca = "dir_location";		
	    this.dirSave = "dir_save";			
	    this.dirSkip = "dir_skip";			
	    this.dirSpac = "dir_spacebar";		
	    this.dirQuit = "dir_quit";						
	    // Node query									
	    this.nPass = "g_northern";			
	    this.sPass = "g_southern";			
	    this.ePass = "g_eastern";			
	    this.wPass = "g_western";			
	    this.hasbeen = "g_visited";			
	    this.isopen = "g_open";				
	    this.locked = "g_locked";			
	    this.need = "g_need";				
	    this.through = "g_through";			
	    this.leads = "g_leadto";			
	    this.vendor = "g_vendor";			
	    // Item search									
	    this.noitems = "g_noitems";			
	    this.nomore = "g_nomore";			
	    this.found = "g_found";				
	    this.replace = "g_replace";			
        //had to change to With vs with	    
        this.With = "g_with";				
	    this.equipped = "g_equipped";		
	    // Battle										
	    this.fightsong = "fight";			
	    this.encounter = "encountered";		
	    this.attack = "enemy_a";			
	    this.defense = "enemy_d";			
	    this.hehas = "enemy_h";				
	    this.nowhas = "enemy_nh";			
	    this.hitpoints = "hp";				
	    this.hitpoint = "hp_1";				
	    this.hitpointsr = "hp_remain";		
	    this.hitpointr = "hp_remain_1";		
	    this.runquestion = "run_away";		
	    this.youlost = "player_l";			
	    this.younow = "player_nh";			
	    this.youattack = "player_a";		
	    this.collected = "collected";					
	    this.easy = "easy_q";				
	    this.fair = "fair_q";				
	    this.risky = "risky_q";				
	    this.enemyMiss = "enemy_m";			
	    this.playerMiss = "player_m";		
	    this.playerDeath = "player_x";		
	    // Vendor										
	    this.welcome = "v_welcome";			
	    this.today = "v_today";				
	    this.purchase = "v_purchase";		
	    this.vfor = "v_for";				
	    this.vgold = "v_gold";				
	    this.nowhave = "v_nowhave";			
	    this.vgoldr = "v_goldremain";		
	    this.afford = "v_cannot";			
	    this.goodbye = "v_goodbye";			
	    // Friend										
	    this.talkto = "talkto";				
	    // Leprechaun									
	    this.leprechaun = "leprechaun";		
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
	    this.leptook = "leptook";			
	    this.leplive = "survive_lep";		
	    this.lepdie = "death_lep";			
	    // Stat											
	    this.sndStatStr = "player_s";		
	    this.sndStatDef = "player_d";		
	    // Misc											
	    this.level = "level";				
	    this.coins = "gold";				
	    this.sndPotion = "player_p_1";		
	    this.sndPotions = "player_p";		
	    this.instruct = "g_instruc";		
	    this.runyes = "run_yes";			
	    this.runno = "run_no";				
	    this.notstrong = "g_notstrong";		
	    // Save & Load game								
	    this.load = "loading";				
	    this.save = "saved";     
    },
    
    _analyzeKey: function(evt){
        if (this._keyHasGoneUp) {
            console.log(this.state);
            this._keyHasGoneUp = false;             
                switch(this.state){  
                    case this.sOff:
                        break;
                    case this.sMove:
                        var result = true;
                        var junk = true;
                        switch(evt.keyCode){
                            case dojo.keys.DOWN_ARROW:
                                this.setState(this.sOff);
                                junk = false;
                                evt.preventDefault();
                                result = this.map.move(this.map.SOUTH);
                                break;
                            case dojo.keys.LEFT_ARROW:
                                this.setState(this.sOff);
                                junk = false;
                                evt.preventDefault();
                                result = this.map.move(this.map.WEST);
                                break;
                            case dojo.keys.RIGHT_ARROW:
                                this.setState(this.sOff);
                                junk = false;
                                evt.preventDefault();
                                result = this.map.move(this.map.EAST);
                                break;
                            case dojo.keys.UP_ARROW:
                                this.setState(this.sOff);
                                junk = false;
                                evt.preventDefault();
                                result = this.map.move(this.map.NORTH);
                                break;
                            case dojo.keys.SPACE:
                                this.setState(this.sOff);
                                junk = false;
                                this.fadeChannel('background');
                                var d = this.player.readStats();
                                d.then(dojo.hitch(this, function(){                                
                                    this._audio.play({url: "sounds/general/"+ this.theme, channel: 'background'});
                                }));
                                break;                                
                        }
                        if(!result){
                            this._audio.stop({channel: "main"});
                            this._audio.play({url: "sounds/noMove", channel : "main"})
                                .anyAfter(dojo.hitch(this,function(){
                                    this.setState(this.sMove);            
                                }));
                        }
                        else if (!junk){
                            this.map.visitCurrentNode();
                            this.enemy = this.map.getNPC(dojo.global.ENEMY);
                            if(this.enemy != null)
                            {
                                var def = this.map.fade();
                                def.then(dojo.hitch(this, function(){
                                    this._audio.play({url: "sounds/general/"+ this.fightsong, channel: 'background'});
                                    this._audio.setProperty({name : 'volume', value: 0.75, channel : 'background', immediate : true});
                                    this._audio.say({text: "You have encountered a " + this.enemy.Name + "."});

                                    //read stats
                                    this._audio.say({text: "Its strength is " + this.enemy.Strength + "."});
                                    this._audio.say({text: "Its defense is " + this.enemy.Defense + "."});
                                    this._audio.say({text: "It has " + this.enemy.HP + " hit points."});
        
                                    //option to run
                                    this._audio.say({text: "Do you want to try to run away?"})
                                        .anyAfter(dojo.hitch(this, function(){
                                            this.setState(this.sRun);
                                        }));
                                }));
                            }
                            else{
                                this.setState(this.sMove);
                            }
                        }
                        if(junk){
                            this.setState(this.sMove);
                        }
                        break;
                    case this.sMenu:
                        switch(evt.keyCode){
                            // 3 to read the menu
                            case dojo.keys.NUMPAD_3:
                            case 51:
                                this.setState(this.sOff);
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
                                //player attack
                                var def = this.playerAttack();
                                def.then(dojo.hitch(this, function(){
                                    if(this.state == this.sFight){
                                        var def = this.enemyAttack();
                                        def.then(dojo.hitch(this,function(){
                                            this.setState(this.sFight);
                                        }));               
                                    }
                                    //otherwise enemy was defeated
                                }));
                                break;
                            case 82: //R run away
                                this.setState(this.sOff);
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
                                    this._audio.say({text: "You have abandoned the fight and returned to your previous location."});
                                    this.fadeChannel("background");

                                    //give enemy health back????
                                    this.enemy = null;
                                    var def = this.map.returnPrevious();
                                    def.then(dojo.hitch(this,function(){
                                        this.setState(this.sMove);
                                    }));
                                }                                
                                break;
                            
                            case 80: //P 
                                break;
                            case 81: //Q
                                break;

                        }  
                        break;
                    case this.sRun:
                        switch(evt.keyCode){
                            case 89: //Y
                                this.setState(this.sOff);
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
                                    this._audio.say({text: "You have avoided the " + this.enemy.Name + " and returned to your previous location."});
                                    this.fadeChannel("background");
                                    var def = this.map.returnPrevious();
                                    def.then(dojo.hitch(this,function(){
                                        this.setState(this.sMove);
                                    }));
                                }
                            break;
                            case 78: //N
                                this.setState(this.sOff);
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
                            this._audio.stop({channel: 'main'});
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
            //this._audio.stop({channel: "second"});
            //this._audio.play({url: "sounds/TooEarlyClick", channel : "second"});
        }
    },
    
    readMenu: function(){
        var def = this.fadeChannel('background');
        def.then(dojo.hitch(this, function(){
            this.setState(this.sListen);
            this._audio.play({url: "sounds/general/"+ this.dirSpac, channel:'main'});
            dojo.forEach([this.dirChar, this.dirItem, this.dirLoca, this.dirEnem,   this.dirSave, this.dirQuit, this.instruct, this.menu], dojo.hitch(this, function(sound){
                this._audio.play({url: "sounds/general/" + sound, channel:'main'}); 
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
                def.then(dojo.hitch(this,function(alive){
                    if(alive){
                        deferred.callback();
                    }
                    else{
                        console.log("player dead, need to fill in what to do");
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
                    var def = this.fadeChannel('background');
                    def.then(dojo.hitch(this,function(){
                        //this.playNow(this.victory, 'background');
                        this.setState(this.sMove);
                        deferred.callback();
                    }));
                    this._audio.say({text: "Successful attack! You have vanquished the " + this.enemy.Name})
                    this.map.defeatedEnemy();
                    this.enemy = null;
                }
                else{
                    this._audio.say({text: "Successful attack! You have weakened the enemy to " + this.enemy.HP + "hit points."})
                    .anyAfter(dojo.hitch(this,function(){
                        this.setState(this.sFight);
                        deferred.callback();
                    }));
                }
            }
            else{ //miss
                this._audio.say({text: "You failed to hit the enemy."});
                this.setState(this.sFight);
            }
        }));
        return deferred;
    },

    /*
        Sets this.state and also publishes to change on screen directions
    */
    setState:function(state){
        this.state = state;
        dojo.publish("stateStatus", [state]);
    },
});

dojo.ready(function() {
    var app = new main();        
});
