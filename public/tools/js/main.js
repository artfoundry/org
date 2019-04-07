/**
 * Org tools
 * Created by LCD Dreams on 4/14/18.
 *
 * Instantiates global objects and starts the app
 */

let Tools = {
    'initialize' : function() {
        this.objectTypes = ['card', 'board'];
        this.allItems = new ItemStorage();
        this.ui = new UI(this.objectTypes[0]);
        this.fbServices = new FirebaseServices();
    }
};

$(function() {
    Tools.initialize();
});
