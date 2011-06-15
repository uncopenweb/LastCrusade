dojo.provide("widgets.map");
dojo.require("dijit._Widget");

dojo.declare('widgets.map', [dijit._Widget], {
    
    mapData: {}, 

    constructor: function() {
        //**poor mans enums
        //directions        
        this.NORTH = 0;
        this.SOUTH = 1;
        this.EAST = 2;
        this.WEST = 3;
        //NPC types
        dojo.global.ENEMY = 0;
        dojo.global.FRIEND = 1;
        dojo.global.VENDOR = 2;
        dojo.global.LEPRECHAUN = 3;

        this.currentNPCIndex = -1;
        this.x = 0;
        this.y = 0;
        var def = uow.getAudio({defaultCaching: true});    //get JSonic
        def.then(dojo.hitch(this, function(audio) { 
            this._audio = audio;
        }));   
    },
    
    postCreate: function() {
        this.lastNodeIndex = 0;
        this.currentNodeIndex = this.mapData.Start;
        this.NPCs = this.mapData.NPCs;
        this.nodes = this.mapData.nodes;
        this.sounds = this.mapData.sounds;
        this.items = this.mapData.items;
        this.finish = this.mapData.End;
        this.Name = this.mapData.Name;
        this.inherited(arguments);
        this.setUpNPCs();
    },

    /*
        attempts to move in the direction specified. 
        may fail if there is no neighbor node in that direction.
        @return boolean indicating success of move
    */
    move: function(direction){
        result = this._getNeighbor(direction);
        if(!result)
        { 
            return false;
        }
        switch(direction){
            case this.NORTH:
                this.y++;
                break;            
            case this.SOUTH:
                this.y--;
                break;            
            case this.EAST:
                this.x++;
                break;            
            case this.WEST:
                this.x--;
                break;
        }      
        return true;
    },

    /*
        attempts to move to neighbor in the specified direction
        if no such neighbor exists, return false.
        otherwise return true and set the new currentNodeIndex
    */
    _getNeighbor: function(direction){
        var neighbor = -1;
        switch(direction){
            case this.NORTH:
                neighbor = this.nodes[this.currentNodeIndex].nNorth;
                break;            
            case this.SOUTH:
                neighbor = this.nodes[this.currentNodeIndex].nSouth;
                break;            
            case this.EAST:
                neighbor = this.nodes[this.currentNodeIndex].nEast;
                break;            
            case this.WEST:
                neighbor = this.nodes[this.currentNodeIndex].nWest;
                break;
        }  
        if(neighbor == -1){
            return false;
        }
        else{
            this.lastNodeIndex = this.currentNodeIndex;
            this.currentNodeIndex = neighbor;
            return true;
        }
    },

    /*
        May eventually be simplfied, not sure what I need right now
    */
    visitCurrentNode: function(){
        var cNode = this.mapData.nodes[this.currentNodeIndex];
        var deferred = new dojo.Deferred();
        cNode.visited = 1;
        if(this.currentNodeIndex == this.mapData.End){
            this.destroyRecursive();
        }
        else{
            //play sound
            if(cNode.Sounds.length>0){
                this._audio.stop({channel: 'map'});
                this._audio.setProperty({name: 'loop', channel: 'map', value: true});
                var sound = this.mapData.sounds[this.oneOf(cNode.Sounds)];
                this._audio.play({url: "sounds/" + this.mapData.Name +".sounds/" + sound, channel: 'map'});
                deferred.callback();
            }
        }
        return deferred;
    },

    /*
        Used when the player runs away from the enemy
    */
    returnPrevious: function(){
        var deferred = new dojo.Deferred();
        var temp = this.currentNodeIndex;
        this.currentNodeIndex = this.lastNodeIndex;
        this.lastNodeIndex = temp;
        var def = this.visitCurrentNode(); 
        def.then(dojo.hitch(this,function(){
            deferred.callback();
        }));
        return deferred;       
    },

    oneOf: function(array){
        return array[Math.floor(Math.random()*array.length)];
    },

    uninitialize: function() {
        var handle = dojo.subscribe("mapStatus", dojo.hitch(this, function(){
            dojo.unsubscribe(handle);
        }));
        dojo.publish("mapStatus", ["mapDestroy"]);
    },

    /*
        Get NPC of a node, build in order of precedence if more than one
    */
    getNPC: function(type){
         var toReturn = null;
         dojo.some(this.nodes[this.currentNodeIndex].NPC, dojo.hitch(this, function(npc, index){
            if(npc.Type == type)
            {
                this.currentNPCIndex = index;
                toReturn = npc;
                return false;
            }
        }));
        return toReturn;
    },

    /*
        fade out and stop channel
    */
    fade: function(){
        var increments=[0.75, 0.5, 0.25, 0.1, 0.05];
        var i = 0;
        var fadeTimer = new dojox.timing.Timer(400);
        var deferred = new dojo.Deferred();
        fadeTimer.onTick = dojo.hitch(this, function() {
            this._audio.setProperty({name : 'volume', value: increments[i], channel : "map", immediate : true});
            if(i == (increments.length - 1))
            {
                fadeTimer.stop();
                this._audio.stop({channel : "map"});
                this._audio.setProperty({name : 'volume', value: 1.0, channel : "map", immediate : true});
                deferred.callback();
            }
            i++;
        });
        fadeTimer.start();
        return deferred;
    },

    /*
        Each NPC has min and max params for health, strength, etc. Need to fixed values.
        Also, for each node, and NPC has a percentage change that it will be at that given
        node, so go ahead and determine that now
    */
    setUpNPCs: function(){
        dojo.forEach(this.nodes, dojo.hitch(this, function(node){
            var toPop = [];
            dojo.forEach(node.NPC, dojo.hitch(this, function(NPCshell, index){
                var randZeroTo99=Math.floor(Math.random()*100);
                if(randZeroTo99 > NPCshell.nPercent){ //not there
                    toPop.push(index);
                }
                else{//set the values and only keep variables we want
                    var cName = this.NPCs[NPCshell.nNPC].cName;
                    var strength = Math.floor(Math.random()*(this.NPCs[NPCshell.nNPC].cStrMax - this.NPCs[NPCshell.nNPC].cStrMin)) + this.NPCs[NPCshell.nNPC].cStrMin;
                    var defense = Math.floor(Math.random()*(this.NPCs[NPCshell.nNPC].cDefMax - this.NPCs[NPCshell.nNPC].cDefMin)) + this.NPCs[NPCshell.nNPC].cDefMin; 
                    var maxHP = Math.floor(Math.random()*(this.NPCs[NPCshell.nNPC].cHPMax - this.NPCs[NPCshell.nNPC].cHPMin)) + this.NPCs[NPCshell.nNPC].cHPMin;
                    var hp = maxHP;
                    var type = this.NPCs[NPCshell.nNPC].cType;
                    
                    var items = new Array();                    
                    //have to do same scheme for items
                    dojo.forEach(this.NPCs[NPCshell.nNPC].items, dojo.hitch(this, function(itemShell){
                        var ItemRandZeroTo99=Math.floor(Math.random()*100);
                        if(ItemRandZeroTo99 > itemShell.cPercent){ //not there
                            //notta
                        }
                        else{
                            items.push(dojo.clone(this.items[itemShell.cItem]));
                        }
                    }));
    
                    var runPerc = this.NPCs[NPCshell.nNPC].cRunPerc;
                    var nameSound = this.NPCs[NPCshell.nNPC].cNameSound;
                    var actionSound = this.NPCs[NPCshell.nNPC].cActionSound;
                    node.NPC[index] = {
                        "Name": cName,
                        "Strength": strength,
                        "Defense": defense,
                        "MaxHP": maxHP,
                        "HP": hp,
                        "Type":type,
                        "Items":items,
                        "RunPerc":runPerc,
                        "NameSound":nameSound,
                        "ActionSound":actionSound
                    };
                }
            }));
            /*
                must pull removing out because otherwise, forEach iteration will fail as we 
                remove. For similar reason, must keep track of # removed thus far
            */            
            var removedSoFar = 0;
            dojo.forEach(toPop, dojo.hitch(this, function(i){
                node.NPC.splice((i - removedSoFar++),1);
            }));
        }));
    },

    defeatedEnemy: function(){
        //remove enemy
        //console.log("Current NPC index: ", this.currentNPCIndex);
        this.nodes[this.currentNodeIndex].NPC.splice(this.currentNPCIndex,1);
        //console.log(this.nodes[this.currentNodeIndex].NPC);
        this.currentNPCIndex = -1;
    }
});
