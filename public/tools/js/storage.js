/**
 * Created by LCD Dreams on 4/14/18.
 */

class ItemStorage {
    constructor(objectTypes) {
        this.objects = {};
        this._initialize(objectTypes);
    }

    _initialize(objectTypes) {
        for(let i=0; i < objectTypes.length; i++) {
            this.objects[objectTypes[i]] = {};
        }
    }

    getItem(type, itemName) {
        return this.objects[type][itemName] || null;
    }

    setItem(type, itemName, item) {
        this.objects[type][itemName] = item;
    }
}
