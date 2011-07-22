dojo.provide("widgets.node");
dojo.require("dijit._Widget");

dojo.declare('widgets.node', [dijit._Widget], {
    
    nodeData: {}, 

    constructor: function() {
        this.nNorth = -1;
        this.nSouth = -1;
        this.nEast = -1;
        this.nWest = -1;
        this.nIndex = -1;
        this.x = -1;
        this.y = -1;
        this.Items = new Array();
        this.RequiredItems = new Array();
        this.NPC = new Array();
        this.Sounds = new Array();
    },
    
    postCreate: function() {
        this.inherited(arguments);
        console.log(this.nodeData);
        this.nNorth = this.nodeData.nNorth;
        this.nSouth = this.nodeData.nSouth;
        this.nEast = this.nodeData.nEast;
        this.nWest = this.nodeData.nWest;
        this.x = this.nodeData.x;
        this.y = this.nodeData.y;
        this.nIndex = this.nodeData.nIndex;
    },
    
    oneOf: function(array){
        return array[Math.floor(Math.random()*array.length)];
    },
});
