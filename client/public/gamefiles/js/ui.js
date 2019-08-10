class UI {
    constructor(player, table, audio) {
        this.player = player;
        this.table = table;

        this._initNav();
    }

    // Set up listeners for nav bar
    _initNav() {
        // let listeners = {
        //     '#main-nav .nav-view-info'      : { callback: this.displayUser.bind(this), params: null },
        //     '#main-nav .nav-create-game'    : { callback: this.table.createGame.bind(this), params: this.player },
        //     '#main-nav .nav-join-game'      : { callback: this.table.joinGame.bind(this), params: this.player }
        // };
        // this.events.uiHandler(listeners);

        $('#main-nav').click((evt)=> {
            let $button = $(evt.target);
            let gameName = 'testgame'; //need to get name from dialog

            if ($button.hasClass('nav-view-info')) {
                this.fetchUser();
            } else if ($button.hasClass('nav-create-game')) {
                this.table.createGame(this.player, gameName);
            } else if ($button.hasClass('nav-join-game')) {
                this.table.joinGame(this.player);
            }
        });
    }

    fetchUser() {
        this.player.getInfo((data) => {
            this.displayUser(data);
        });

    }

    displayUser(data) {
        console.log(data);
    }

    /*************************
     * displayGame
     *
     * @type {{
     *  gameData: {
     *      creator: string,
     *      name: string,
     *      playerCount: int,
     *      playerIds: array of strings,
     *      sets: array of strings
     *      },
     *  gameId: string
     * }}
     *************************/

    displayGame(gameData) {
        $('main').text(gameData.name + ' started by ' + gameData.creator);
    }
}
