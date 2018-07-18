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
            ui = new UI(allItems),
            fbServices = {};

        if (!fbServices.isOnline)
            this.fbServices = new FirebaseServices(objectTypes, allItems, ui.toggleMain, ui.updateList);
    }
};

$(Tools.initialize());
