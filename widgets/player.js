dojo.provide("widgets.player");
dojo.require("dijit._Widget");

dojo.declare('widgets.player', [dijit._Widget], {
    
    playerData: {}, 

    constructor: function() {
        this.hp = 100;
        this.gold = 100;
        this.maxHP = this.hp;
        this.strength = 0;
        this.defense = 0;
        this.potions = null;
        this.weapon = null;
        this.armor = null;
        this.specialItems = null;
    },
    
    postCreate: function() {},

    reset: function(direction){
        this.hp = this.maxHP = this.gold = 100;
        this.strength = this.defense = 0;
        this.weapon = null;
        this.armor = null;
    },

    /*
        updates hp in respone to integer change
    */
    updateHP: function(change){
        this.hp+=change;
    }
});
