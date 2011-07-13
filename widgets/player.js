dojo.provide("widgets.player");
dojo.require("dijit._Widget");

dojo.declare('widgets.player', [dijit._Widget], {
    
    playerData: {}, 

    constructor: function() {
        this.hp = 100;
        this.gold = 100;
        this.maxHP = 100;
        this.strength = 0;
        this.defense = 0;
        this.potions = new Array();
        this.weapon = null;
        this.armor = null;
        this.specialItems = new Array();
        this.ready = false;
        var def = uow.getAudio({defaultCaching: true});
        def.then(dojo.hitch(this, function(audio) { 
            this._audio = audio;
            this.ready = true;
        }));
    },
    
    postCreate: function() {},

    reset: function(direction){
        this.hp = this.maxHP = this.gold = 100;
        this.strength = this.defense = 0;
        this.weapon = null;
        this.armor = null;
    },

    readStats: function(){
        if(this.ready)
        {
            this._audio.say({text: 'You currently have strength of ' + this.strength});
            this._audio.say({text: 'You currently have defense of ' + this.defense});
            this._audio.say({text: 'You currently have ' + this.hp + ' hit points.'});
            this._audio.say({text: 'You currently have ' + this.gold + ' gold.'});
            if(this.potions.length > 0){
                dojo.forEach(this.potions, dojo.hitch(this,function(potion){
                    this._audio.say({text: 'You have a ' + potion.iName + ' level ' + potion.iValue});
                }));
            }
            else{
                this._audio.say({text: 'You currently have no potions.'});
            }     
            if(this.specialItems.length > 0){
                dojo.forEach(this.specialItems, dojo.hitch(this,function(item){
                    this._audio.say({text: 'You have a ' + item.iName});
                }));
            }
            else{
                this._audio.say({text: 'You currently have no specialItems.'});
            }               

        }
    },

    /*
        equipWeakItems: Find weakest weapon & armor in map and add to player
    */
    equipWeakItems: function(map){
	    var lowArmor, lowWeapon;
        var aValue = Infinity;
        var wValue = Infinity;
	    dojo.forEach(map.items, dojo.hitch(this,function(item, index){
		    switch(item.iType)
		    {
                case dojo.global.WEAPON:
			        if(item.iValue < wValue)
			        {
                        wValue = item.iValue;
                        lowWeapon = index;
			        }
                    break;
		        case dojo.global.ARMOR:
			        if(item.iValue < aValue)
			        {
                        aValue = item.iValue;
                        lowArmor = index;
			        }
                    break;
		    }
	    }));
	    this.weapon = map.items[lowWeapon];
	    this.armor = map.items[lowArmor];
        this.strength = this.weapon.iValue;
        this.defense = this.armor.iValue;
    },
    /*
        updates hp in respone to integer change
    */
    updateHP: function(change){
        this.hp+=change;
        if(this.hp > this.maxHP){
            this.hp = this.maxHP;
        }
        var deferred = new dojo.Deferred();
        if(change < 0){ //lost health
            var temp = - change;
            if(this.hp <= 0){
                this._audio.say({text: "The enemy was too much for you to handle. You have been slain."})
                    .anyAfter(dojo.hitch(this,function(){
                        deferred.callback({alive: false});
                    })); 
            }    
            else if(temp == 1){
                this._audio.say({text: "You have lost " + temp + " hit point. You now have " + this.hp + " hit points."});
                deferred.callback({alive: true});
            }            
            else{
                this._audio.say({text: "You have lost " + temp + " hit points. You now have " + this.hp + " hit points."});
                deferred.callback({alive: true}); 
            }
        }
        else{
            if(change == 1){
                this._audio.say({text: "You have gained " + change + " hit point. You now have " + this.hp + " hit points."});
            }
            else{
                this._audio.say({text: "You have gained " + change + " hit points. You now have " + this.hp + " hit points."});
            }
            deferred.callback({alive: true});
        }
        return deferred;
    },

    /*
        updates hp in respone to integer change, wait to call deferred until after reading done
    */
    updateHPplusWait: function(change){
        this.hp+=change;
        if(this.hp > this.maxHP){
            this.hp = this.maxHP;
        }
        var deferred = new dojo.Deferred();
        if(change < 0){ //lost health
            var temp = - change;
            if(this.hp <= 0){
                this._audio.say({text: "The enemy was too much for you to handle. You have been slain."})
                    .anyAfter(dojo.hitch(this,function(){
                        deferred.callback({alive: false});
                    })); 
            }    
            else if(temp == 1){
                this._audio.say({text: "You have lost " + temp + " hit point. You now have " + this.hp + " hit points."})
                    .anyAfter(dojo.hitch(this,function(){
                        deferred.callback({alive: true});
                    }));
            }            
            else{
                this._audio.say({text: "You have lost " + temp + " hit points. You now have " + this.hp + " hit points."})
                    .anyAfter(dojo.hitch(this,function(){
                        deferred.callback({alive: true});
                    }));
            }
        }
        else{
            if(change == 1){
                this._audio.say({text: "You have gained " + change + " hit point. You now have " + this.hp + " hit points."}).anyAfter(dojo.hitch(this,function(){
                    deferred.callback({alive: true});
                }));
            }
            else{
                this._audio.say({text: "You have gained " + change + " hit points. You now have " + this.hp + " hit points."}).anyAfter(dojo.hitch(this,function(){
                    deferred.callback({alive: true});
                }));
            }
        }
        return deferred;
    },

    /*
        Add an item to player
    */
    addItem:function(item){
        switch(item.iType){
            case dojo.global.WEAPON:
                this.weapon = item;
                this.strength = this.weapon.iValue;
                break;
		    case dojo.global.ARMOR:
                this.armor = item;
                this.defense = this.armor.iValue;
                break;
            case dojo.global.POTION:
                this.potions.push(item);
                break;
            case dojo.global.GOLD:
                this.gold+=item.iValue;
                break;
            case dojo.global.SPECIAL:
                this.specialItems.push(item);
                break;
        }
    },
    
    halfGold:function(){
        this.gold = Math.floor(this.gold/2);
    },

    stopAudio: function(){
        this._audio.stop();
    },
});
