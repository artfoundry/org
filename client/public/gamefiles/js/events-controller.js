class EventsController {
    constructor(ui) {
        this.ui = ui;
        this.initListeners();
    }

    initListeners() {
        window.addEventListener('update-ui', (evt) => {
            evt.detail.callback(evt.detail.data);
        });
    }

    removeListener(listener) {

    }

}
