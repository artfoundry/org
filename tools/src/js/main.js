/**
 * Org
 * Created by LCD Dreams on 4/14/18.
 *
 * Instantiates global objects and starts the app
 */

let Tool = {
    'fbServices' : {},
    'helpers' : new Helpers(),
    'initialize' : function() {
        if (!this.fbServices.isOnline)
            this.fbServices = new FirebaseServices();
        let events = new Events();
        let ui = new UI(events);

        ui.initialize();
    }
};

$(Tool.initialize());
