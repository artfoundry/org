/**
 * Org tools
 * Created by LCD Dreams on 4/14/18.
 *
 * Instantiates global objects and starts the app
 */

let Tools = {
    'initialize' : function() {
        let initialDisplayType = '';

        this.objectTypes = ['card', 'board'];
        initialDisplayType = this.objectTypes[0];
        this.allItems = new ItemStorage();
        this.ui = new UI(initialDisplayType);
        this.fbServices = new FirebaseServices();
    }
};

$(function() {
    Tools.initialize();
});
