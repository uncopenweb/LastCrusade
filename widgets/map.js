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

        this.x = 0;
        this.y = 0;
        var def = uow.getAudio({defaultCaching: true});    //get JSonic
        def.then(dojo.hitch(this, function(audio) { 
            this._audio = audio;
        }));   
    },
    
    postCreate: function() {
        console.log(this.mapData);
        this.currentNodeIndex = this.mapData.Start;
        this.NPCs = this.mapData.NPCs;
        this.nodes = this.mapData.nodes;
        this.sounds = this.mapData.sounds;
        this.items = this.mapData.items;
        this.finish = this.mapData.End;
        this.Name = this.mapData.Name;
        this.inherited(arguments);
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
        neighbor = -1;
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
            this.currentNodeIndex = neighbor;
            return true;
        }
    },

    visitCurrentNode: function(){
        var cNode = this.mapData.nodes[this.currentNodeIndex];
        cNode.visited = 1;
        if(this.currentNodeIndex == this.mapData.End){
            this.destroyRecursive();
        }
        else{
            //play sound
            if(cNode.Sounds.length>0){
                this._audio.stop({channel: 'map'});
                this._audio.setProperty({name: 'loop', channel: 'map', value: true});
                sound = this.mapData.sounds[this.oneOf(cNode.Sounds)];
                console.log(sound);
                this._audio.play({url: "sounds/" + this.mapData.Name +".sounds/" + sound, channel: 'map'}); 
            }
            //this should probably be in main
            var enemy = this.getNPC(dojo.global.ENEMY);
            if(enemy != null)
            {
               
            }
        }
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

    getNPC: function(type){
         dojo.forEach({this.nodes[this.currentNodeIndex].NPC, dojo.hitch(this, function(npcShell){
            if(this.NPCs[npcShell.nNPC].cType == type)
            {
                return this.NPCs[npcShell.nNPC];
            }
        }));
        return null;
    },
});
