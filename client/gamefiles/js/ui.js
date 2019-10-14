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
        this.getGameChoice = this.getGameChoice.bind(this);
        this.processGameNameEntry = this.processGameNameEntry.bind(this);
        this.displayError = this.displayError.bind(this);
        this.hideError = this.hideError.bind(this);
        this.displayWarning = this.displayWarning.bind(this);
        this.hideWarning = this.hideWarning.bind(this);
        this.renderGameList = this.renderGameList.bind(this);
        this.updateGame = this.updateGame.bind(this);

        this._initNav();
    }

    /**
     * _initNav
     * Sets up listeners for nav bar
     * dialogOptions needs to have:
     * - template for modal
     * - processContent function for processing modal content to display
     * - processInput function to process data to send to server (that needs to be checked, and if error, error displayed on modal
     * - callbackParams object with player name, game id or name, display callback, and action type message to send to server
     * - callback function to call once game data is retrieved from server
     * @private
     */
    _initNav() {
        $('#main-nav').click((evt)=> {
            let $button = $(evt.target);
            let dialogOptions = {};
            // this should be generic class function
            let typeListener = () => {
                let $textField = $('#enter-game-name');
                $textField.val('');
                $textField.keydown(() => {
                    this.hideError('#modal');
                });
            };
            let getPlayerInfo = () => {
                this.player.getInfo((results) => {
                    $('#user-info').html(results);
                });
            };

            if ($button.hasClass('nav-view-info')) {
                dialogOptions = {
                    template: this.$templates.userInfo,
                    processContent: {action: getPlayerInfo, callback: null}
                };

            } else if ($button.hasClass('nav-create-game')) {
                dialogOptions = {
                    template: this.$templates.createGame,
                    processContent: {action: typeListener, callback: null},
                    processInput: this.processGameNameEntry,
                    callbackParams: {player: this.player, gameData: null, callback: this.updateGame, messageType: 'create-game'},
                    callback: this.table.createGame.bind(this.table)
                };

            } else if ($button.hasClass('nav-join-game')) {
                dialogOptions = {
                    template: this.$templates.joinGame,
                    processContent: {action: this.getGameList, callback: this.renderGameList},
                    processInput: this.getGameChoice,
                    callbackParams: {player: this.player, gameData: null, callback: this.updateGame, messageType: 'join-game'},
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

    /*************************
     * processGameNameEntry
     * processInput function for displayDialog
     * Gets game name user entered, checks that it's long enough and isn't already taken,
     * then returns true above are true, which then allows displayDialog to continue;
     * or returns false if either above is false, which then prevents displayDialog from continuing.
     *
     * @returns {boolean}
     *************************/
    async processGameNameEntry() {
        let gameName = $('#enter-game-name').val();
        let isValid = null;

        this.displayWarning('#modal');
        await this.isNameAvailable(gameName).then((nameIsAvailable) => {
            this.hideWarning('#modal');
            if (gameName && gameName.length >= 3 && nameIsAvailable) {
                this.game.name = gameName;
                isValid = true;
            } else {
                this.displayError('#modal');
                isValid = false;
            }
        }).catch((error) => {
            this.hideWarning('#modal');
            this.postMessage({
                messageType: 'error',
                messageDetails: error
            });
        });

        return isValid;
    }

    isNameAvailable(nameToCheck) {
        return new Promise((resolve, reject) => {
            this.getGameList((gameList) => {
                for (let game in gameList) {
                    if (gameList.hasOwnProperty(game) && gameList[game].name === nameToCheck) {
                        resolve(false);
                    }
                }
                resolve(true);
            });
        });
    }

    getGameChoice() {
        this.game.id = $('#modal .game-list .game-list-row-selected .game-list-text-name').data('game');
        return true;
    }

    displayError(selector) {
        $(selector + ' .error-text').show();
    }

    hideError(selector) {
        $(selector + ' .error-text').hide();
    }

    displayWarning(selector) {
        $(selector + ' .warning-text').show();
    }

    hideWarning(selector) {
        $(selector + ' .warning-text').hide();
    }

    /*************************
     * getGameList
     * Calls server to get list of available games in database
     *
     * processInput function for displayDialog
     *************************/
    getGameList(callback) {
        this.socket.on('game-list-sent', (gameList) => {
            callback(gameList);
        });
        this.socket.emit('get-game-list');
    }

    /*************************
     * renderGameList
     * Inserts game list data into markup template for display in game list modal
     *
     * @param gameList: object of game data objects
     *************************/
    renderGameList(gameList) {
        let gameText = '';
        let ui = this;
        let $gameList = $('#modal .game-list');

        $gameList.html('');
        for (let game in gameList) {
            if (gameList.hasOwnProperty(game)) {
                gameText = $(document.createElement('div')).addClass('game-list-row').html(`
                    <span class="game-list-text game-list-text-name" data-game="${game}">${gameList[game].name}</span>
                    <span class="game-list-text">${gameList[game].creator}</span>
                    <span class="game-list-text">${gameList[game].playerCount}</span>
                `);
                $gameList.append(gameText[0]);
                $('.game-list-row').click(function() {
                    $(this).addClass('game-list-row-selected');
                    ui.game.id = game;
                });
            }
        }
    }

    /*************************
     * updateGame
     * callbackParams callback function for displayDialog
     *
     * @param gameData: {
     *      creator: string,
     *      name: string,
     *      playerCount: int,
     *      playerIds: array of strings,
     *      sets: array of strings
     * }
     *************************/
    updateGame(gameData, messageType) {
        this.board.updateBoard(gameData);
        this.postMessage({messageType, gameData});
    }

    /*************************
     * postMessage
     * Displays message in sidebar
     *
     * @param payload: {
     *     messageType: string,
     *     messageDetails: string or null depending on server response,
     *     gameData: {playerId}
     * }
     ************************/
    postMessage(payload) {
        let messageKey = payload.messageType || null;
        let messageDetails = payload.messageDetails || null;
        let gameData = payload.gameData || null;
        let message = '';

        switch(messageKey) {
            case 'login': message = `${gameData.player} has logged in`; break;
            case 'login-failed': message = 'Login failed due to: ' + messageDetails; break;
            case 'create-game': message = `${gameData.name} started by ${gameData.creator}`; break;
            case 'join-game': message = `${gameData.player} has joined ${gameData.name}`; break;
            case 'error': message = 'An error has occurred: ' + messageDetails; break;
        }
        $('#messages').text(message);
    }

    /*************************
     * displayDialog
     * Accepts a set of options to determine modal content, user interaction processing,
     * and data and callback to send to destination
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
        let processContent = dialogOptions.processContent ? dialogOptions.processContent.action : null;
        let contentFollowup = dialogOptions.processContent ? dialogOptions.processContent.callback : null;

        if (processContent) {
            contentFollowup ? processContent(contentFollowup) : processContent();
        }

        $modal.show();
        $modalBackdrop.show();
        if ($cancelButton) {
            $cancelButton.click(() => {
                this.hideError('#modal');
                $modal.hide();
                $modalBackdrop.hide();
            });
        }
        $modal.find('#button-primary').click(async () => {
            let inputValid = null;
            if (dialogOptions.processInput) {
                inputValid = await dialogOptions.processInput();
            }
            if (inputValid) {
                this.hideError('#modal');
                $modal.hide();
                $modalBackdrop.hide();
                if (dialogOptions.callback) {
                    dialogOptions.callbackParams.gameData = this.game;
                    dialogOptions.callback(dialogOptions.callbackParams);
                }
            }
        });
    }
}
