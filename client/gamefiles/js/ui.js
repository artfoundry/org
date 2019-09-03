class UI {
    constructor(socket, player, table, board, audio) {
        this.socket = socket;
        this.player = player;
        this.game = {
            name: '',
            id: ''
        };
        this.table = table;
        this.board = board;
        this.audio = audio;

        this.tempPaths = {
            createGame: 'html/create_game_modal.html',
            joinGame: 'html/join_game_modal.html',
            userInfo: 'html/user-info-modal.html'
        };
        this.$templates = {};
        this._loadTemplates();

        this.getGameList = this.getGameList.bind(this);
        this.readGameName = this.readGameName.bind(this);
        this.displayError = this.displayError.bind(this);
        this.hideError = this.hideError.bind(this);
        this.renderGameList = this.renderGameList.bind(this);
        this.updateGame = this.updateGame.bind(this);

        this._initNav();
    }

    // Set up listeners for nav bar
    // For dialogOptions need to send:
    // - template for modal
    // - getContent function for retrieving modal content to display
    // - serverCallback function to send data to server (that needs to be checked, and if error, error displayed on modal
    // - serverCallbackParams object with player name and game id or name to send to server
    // - displayCallback function to call once game data is retrieved from server (this may only need to be updateGame
    // NOTE: need way to get game ID/name to serverCallbackParams
    _initNav() {
        $('#main-nav').click((evt)=> {
            let $button = $(evt.target);
            let dialogOptions = {};

            if ($button.hasClass('nav-view-info')) {
                dialogOptions = {
                    template: this.$templates.userInfo,
                    processContent: () => {
                        $('#user-info').text(this.player.getInfo());
                    }
                };

            } else if ($button.hasClass('nav-create-game')) {
                dialogOptions = {
                    template: this.$templates.createGame,
                    processContent: null,
                    processInput: this.readGameName,
                    callbackParams: {player: this.player, gameData: null, callback: this.updateGame},
                    callback: this.table.createGame.bind(this.table)
                };

            } else if ($button.hasClass('nav-join-game')) {
                dialogOptions = {
                    template: this.$templates.joinGame,
                    processContent: this.getGameList,
                    processInput: this.readGameChoice,
                    callbackParams: {player: this.player, gameData: null, callback: this.updateGame},
                    callback: this.table.joinGame.bind(this.table)
                };
            }
            this.displayDialog(dialogOptions);
        });
    }

    _loadTemplates() {
        let $tempContainer = $('#tempContainer');

        for (let template in this.tempPaths) {
            if (this.tempPaths.hasOwnProperty(template)) {
                $tempContainer.load(this.tempPaths[template], (responseText) => {
                    this.$templates[template] = $(responseText);
                });
            }
        }
    }

    getGameInfo() {
        return this.game;
    }

    getGameList() {
        this.socket.on('game-list-sent', async (gameList) => {
            return await this.renderGameList(gameList);
        });
        this.socket.emit('get-game-list');
    }

    readGameName() {
        let $gameName = $('#enter-game-name').val();

        if ($gameName && $gameName.length >= 3) {
            this.hideError('#create-game-modal');
            this.game.name = $gameName;
            return true;
        } else {
            this.displayError('#create-game-modal');
            return false;
        }
    }

    readGameChoice() {
        this.game.id = $('#game-list').data('id');
    }

    displayError(selector) {
        $(selector + ' .error-text').show();
    }

    hideError(selector) {
        $(selector + ' .error-text').hide();
    }

    renderGameList(list) {
        $('#game-list').text(list);
    }

    /*************************
     * updateGame
     *
     * @param gameData: {
     *      creator: string,
     *      name: string,
     *      playerCount: int,
     *      playerIds: array of strings,
     *      sets: array of strings
     * }
     *************************/

    updateGame(gameData) {
        $('#messages').text(gameData.name + ' started by ' + gameData.creator);
        this.board.updateBoard(gameData);
    }

    /*************************
     * displayDialog
     *
     * @param dialogOptions: {
     *      template: string - path to template file
     *      content: function
     *      callbackParams: object
     *      callback: function - action to take when non-cancel button is pressed
     * }
     *************************/

    displayDialog(dialogOptions) {
        let $modal = $('#modal').html(dialogOptions.template);
        let $modalBackdrop = $('#modal-backdrop');
        let $cancelButton = $modal.find('#button-cancel');

        if (dialogOptions.processContent) {
            dialogOptions.processContent();
        }
        $modal.show();
        $modalBackdrop.show();
        if ($cancelButton) {
            $cancelButton.click(() => {
                $modal.hide();
                $modalBackdrop.hide();
            });
        }
        $modal.find('#button-primary').click(() => {
            if (!dialogOptions.processInput || (dialogOptions.processInput && dialogOptions.processInput())) {
                $modal.hide();
                $modalBackdrop.hide();
                if (dialogOptions.callback) {
                    dialogOptions.callbackParams.gameData = this.getGameInfo();
                    dialogOptions.callback(dialogOptions.callbackParams);
                }
            }
        });
    }
}
