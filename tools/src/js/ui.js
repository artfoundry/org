class UI {
    constructor(events) {

    }

    initialize() {

    }

    update(type, objects) {
        for (let i=0; i < objects.length; i++) {
            let items = objects[i];
            let keys = Object.keys(items);
            for (let num=0; num < keys.length; num++) {
                let key = keys[num];
                $("." + type).append("<div>" + key + " : " + items[key] + "</div>");
            }
        }
    }
}
