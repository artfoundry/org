class EventsController {
    constructor(ui) {
        this.ui = ui;
        this.initListeners();
    }

    initListeners() {
        window.addEventListener('display-game', (evt) => {
            console.log(evt)
            this.ui.displayGame(evt.detail);
        });
    }

    /**********************************
        uiHandler()
        Store event listeners for UI
        vars:
        listeners: obj - format: {[DOM selector]: [callback]}
     **********************************/
    uiHandler(listeners) {
        for (let selector in listeners) {
            if (listeners.hasOwnProperty(selector)) {
                let callback = listeners[selector].callback;
                let params = listeners[selector].params;
                this.events.navigation = $(selector).click(() => {
                    callback(params);
                });
            }
        }
    }

    removeListeners(listeners) {

    }

}
