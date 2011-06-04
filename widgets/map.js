dojo.provide("widgets.map");
dojo.require("dijit._Widget");

dojo.declare('widgets.map', [dijit._Widget], {
    
    mapData: {}, 

    constructor: function() {
        this.NORTH = 0;
        this.SOUTH = 1;
        this.EAST = 2;
        this.WEST = 3;
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
        //play sound
        if(cNode.Sounds.length>0){
            this._audio.stop({channel: 'map'});
            this._audio.setProperty({name: 'loop', channel: 'map', value: true});
            sound = this.mapData.sounds[this.oneOf(cNode.Sounds)];
            console.log(sound);
            this._audio.play({url: "sounds/" + this.mapData.Name +".sounds/" + sound, channel: 'map'}); 
        }
    },

    oneOf: function(array){
        return array[Math.floor(Math.random()*array.length)];
    },
});
