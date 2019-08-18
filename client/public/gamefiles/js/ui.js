class UI {
    constructor(player, table, audio) {
        this.player = player;
        this.table = table;
        this.audio = audio;

        this.dialogs = {
            'gameName' : 'What do you want to call the game?',

        };
        this._initNav();
    }

    // Set up listeners for nav bar
    _initNav() {
        $('#main-nav').click((evt)=> {
            let $button = $(evt.target);
            let gameName = this.displayDialog(this.dialogs.gameName); //need to get name from dialog

            if ($button.hasClass('nav-view-info')) {
                this.player.getInfo(this.displayUser.bind(this));

            } else if ($button.hasClass('nav-create-game')) {
                this.table.createGame(this.player, gameName, this.displayGame.bind(this));

            } else if ($button.hasClass('nav-join-game')) {
                this.table.joinGame(this.player);
            }
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
        $('#messages').text(gameData.name + ' started by ' + gameData.creator);
    }

    displayDialog(dialogText) {
        let response = null;

        return response;
    }
}
