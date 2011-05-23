dojo.provide('widgets.item');

dojo.declare('widgets.item', null, {
    itemCompare: function(i1, i2){
        return (i1.iActionSound == i2.iActionSound &&
                i1.iName == i2.iName &&
                i1.iNameSound == i2.iNameSound &&
                i1.iType == i2.iType &&
                i1.iValue == i2.iValue);
    },
});
