/**
 * Org tools
 * Created by LCD Dreams on 4/14/18.
 *
 * Instantiates global objects and starts the app
 */

let Tools = {
    'fbServices' : {},
    'helpers' : new Helpers(),
    'objectTypes' : ['card', 'board'],
    'initialize' : function() {
        let ui = new UI();
        if (!this.fbServices.isOnline)
            this.fbServices = new FirebaseServices(this.objectTypes, ui.updateList);
    }
};

$(Tools.initialize());
