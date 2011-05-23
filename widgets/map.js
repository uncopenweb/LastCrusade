dojo.provide("widgets.map");
dojo.require("dijit._Widget");

dojo.declare('widgets.map', [dijit._Widget], {
    
    mapData: {}, 

    constructor: function() {
        this.north = 0;
        this.south = 1;
        this.east = 2;
        this.west = 3;
        this.x = 0;
        this.y = 0;
    },
    
    postCreate: function() {
        this.currentNodeIndex = this.mapData.Start;
        this.NPCs = this.mapData.NPCs;
        this.nodes = this.mapData.nodes;
        this.sounds = this.mapData.sounds;
        this.items = this.mapData.items;
        this.finish = this.mapData.End;
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
            console.log("Did not move:");   
            console.log("X: " + this.x + " Y: " + this.y);   
            return false;
        }
        switch(direction){
            case this.north:
                this.y++;
                break;            
            case this.south:
                this.y--;
                break;            
            case this.east:
                this.x++;
                break;            
            case this.west:
                this.x--;
                break;
        }      
        console.log("Moved:");   
        console.log("X: " + this.x + " Y: " + this.y);   
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
            case this.north:
                neighbor = this.nodes[this.currentNodeIndex].nNorth;
                break;            
            case this.south:
                neighbor = this.nodes[this.currentNodeIndex].nSouth;
                break;            
            case this.east:
                neighbor = this.nodes[this.currentNodeIndex].nEast;
                break;            
            case this.west:
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
    }
});
