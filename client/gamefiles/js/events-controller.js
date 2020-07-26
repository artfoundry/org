class EventsController {
    constructor(ui) {
        this.ui = ui;
        this.initListeners();
    }

    initListeners() {
        window.addEventListener('update-ui', (evt) => {
            this.ui[evt.detail.callback](evt.detail.data);
        });
    }

    removeListener(listener) {

    }

}
