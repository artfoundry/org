/**
 * Created by LCD Dreams on 4/14/18.
 */

class ItemStorage {
    constructor() {
        this._objects = {};
        this._initialize(Tools.objectTypes);
    }

    _initialize(objectTypes) {
        for (let i=0; i < objectTypes.length; i++) {
            this._objects[objectTypes[i]] = {};
        }
    }

    getItem(type, itemName) {
        return this._objects[type][itemName] || null;
    }

    getAllItems(type) {
        return this._objects[type];
    }

    setItem(type, itemName, item) {
        this._objects[type][itemName] = item;
    }
}
