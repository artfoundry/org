/**
 * Org tools
 * Created by LCD Dreams on 4/14/18.
 *
 * Instantiates global objects and starts the app
 */

let Tools = {
    'initialize' : function() {
        let objectTypes = ['card', 'board'],
            allItems = new ItemStorage(objectTypes),
            ui = new UI(allItems);

        this.fbServices = new FirebaseServices(objectTypes, allItems, ui.updateList.bind(ui));
    }
};

$(function() {
    Tools.initialize();
});
