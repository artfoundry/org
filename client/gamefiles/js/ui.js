class UI {
    constructor(socket, player, table, board, audio) {
        this.socket = socket;
        this.player = player;
        this.playerInfo = {};
        this.game = {
            name: '',
            gameId: ''
        };
        this.mustRenderList = false;
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

        this._getPlayerInfo = this._getPlayerInfo.bind(this);
        this._getGameList = this._getGameList.bind(this);
        this._processGameNameEntry = this._processGameNameEntry.bind(this);
        this._displayWarning = this._displayWarning.bind(this);
        this._hideWarning = this._hideWarning.bind(this);
        this._renderGameList = this._renderGameList.bind(this);
        this.updateGame = this.updateGame.bind(this);

        this.player.playerLogin(this._postMessage);
        this._initSocketListeners();
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
                    this._hideWarning('#modal .warning');
                });
            };

            if ($button.hasClass('nav-view-info')) {
                dialogOptions = {
                    template: this.$templates.userInfo,
                    processContent: this._getPlayerInfo,
                    processContentCallback: this._renderGameList
                };

            } else if ($button.hasClass('nav-create-game')) {
                dialogOptions = {
                    template: this.$templates.createGame,
                    processContent: typeListener,
                    processInput: this._processGameNameEntry,
                    callbackParams: {player: this.player, gameData: null, callback: this.updateGame, messageType: 'create-game'},
                    callback: this.table.createGame.bind(this.table)
                };

            } else if ($button.hasClass('nav-join-game')) {
                dialogOptions = {
                    template: this.$templates.joinGame,
                    processContent: this._getGameList,
                    processContentCallback: () => { this.mustRenderList = true; },
                    processInput: null,
                    callbackParams: {player: this.player, gameData: null, callback: this.updateGame, messageType: 'join-game'},
                    callback: this.table.joinGame.bind(this.table)
                };
            }
            this._displayDialog(dialogOptions);
        });
    }

    _initSocketListeners() {
        this.socket.on('game-list-retrieved', async (gameList) => {
            let list = await gameList;
            if (this.mustRenderList) {
                this._renderGameList(list);
                this.mustRenderList = false;
            }
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
     * _processGameNameEntry
     * processInput function for _displayDialog
     * Gets game name user entered, checks that it's long enough and isn't already taken,
     * then returns true above are true, which then allows _displayDialog to continue;
     * or returns false if either above is false, which then prevents _displayDialog from continuing.
     *
     * @returns {boolean}
     *************************/
    async _processGameNameEntry() {
        let gameName = $('#enter-game-name').val();
        let isValid = null;

        this._displayWarning('#modal .wait-text');
        await this._isNameAvailable(gameName).then((nameIsAvailable) => {
            this._hideWarning('#modal .wait-text');
            if (gameName && gameName.length >= 3 && nameIsAvailable) {
                this.game.name = gameName;
                isValid = true;
            } else {
                this._displayWarning('#modal .error-text');
                isValid = false;
            }
        }).catch((error) => {
            this._hideWarning('#modal .wait-text');
            this._postMessage({
                messageType: 'error',
                messageDetails: error
            });
        });

        return isValid;
    }

    _isNameAvailable(nameToCheck) {
        return new Promise((resolve, reject) => {
            this._getGameList((gameList) => {
                for (let game in gameList) {
                    if (gameList.hasOwnProperty(game) && gameList[game].name === nameToCheck) {
                        resolve(false);
                    }
                }
                resolve(true);
            });
        });
    }

    _displayWarning(selector) {
        $(selector).show();
    }

    _hideWarning(selector) {
        $(selector).hide();
    }

    _getPlayerInfo(callback) {
        this.player.getInfo(async (results) => {
            this.playerInfo = await results;
            if (callback) {
                callback();
            }
        });
    }

    /*************************
     * _getGameList
     * Calls server to get list of available games in database
     *
     * processInput function for _displayDialog
     *************************/
    _getGameList(callback) {
        this.socket.emit('get-game-list', this.player.userId);
        if (callback) {
            callback();
        }
    }

    /*************************
     * _renderGameList
     * Inserts game list data into markup template for display in game list modal
     *
     * processContentCallback function for _getPlayerInfo
     *
     * @param gameList
     *************************/
    _renderGameList(gameList = this.playerInfo.gameIds || []) {
        let $gameText = null;
        let ui = this;
        let $gameListMarkup = $('#modal .game-list');

        $gameListMarkup.html('');
        if (gameList.length === 0) {
            $gameText = $(document.createElement('div')).addClass('game-list-row-nogames').html(`
                <span class="game-list-text">No games available</span>
            `);
            $gameListMarkup.append($gameText);
        } else {
            for (let game in gameList) {
                if (gameList.hasOwnProperty(game)) {
                    $gameText = $(document.createElement('div')).addClass('game-list-row').html(`
                        <span class="game-list-text game-list-text-name" data-game="${gameList[game].gameId}">${gameList[game].name}</span>
                        <span class="game-list-text">${gameList[game].creator}</span>
                        <span class="game-list-text">${gameList[game].playerCount}</span>
                    `);
                    $gameText.click(function() {
                        let $prevSelected = $('.game-list-row-selected');
                        let $gameName = $(this).find('.game-list-text-name');

                        if ($(this).hasClass('game-list-row-selected')) {
                            $(this).removeClass('game-list-row-selected');
                            ui.game = {
                                name: '',
                                gameId: ''
                            };
                        } else {
                            if ($prevSelected.length > 0) {
                                $prevSelected.removeClass('game-list-row-selected');
                            }
                            $(this).addClass('game-list-row-selected');
                            ui.game = {
                                name: $gameName.innerText,
                                gameId: $gameName.data('game')
                            };
                        }
                    });
                    $gameListMarkup.append($gameText);
                }
            }
        }
    }

    /*************************
     * updateGame
     * callbackParams callback function for _displayDialog
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
        if (gameData !== null) {
            this.board.updateBoard(gameData);
        }
        this._postMessage({gameData, messageType});
    }

    /*************************
     * _postMessage
     * Displays message in sidebar
     *
     * @param payload: {
     *     messageType: string,
     *     messageDetails: string or null depending on server response,
     *     gameData: {playerId}
     * }
     ************************/
    _postMessage(payload) {
        let messageKey = payload.messageType || null;
        let messageDetails = payload.messageDetails || null;
        let gameData = payload.gameData || null;
        let message = '';

        switch(messageKey) {
            case 'login': message = `${gameData.player} has logged in`; break;
            case 'login-failed': message = 'Login failed due to: ' + messageDetails; break;
            case 'create-game': message = `${gameData.name} started by ${gameData.creator}`; break;
            case 'join-game': message = `${gameData.player} has joined ${gameData.name}`; break;
            case 'already-in-game': message = 'You are already a player in that game!'; break;
            case 'error': message = 'An error has occurred: ' + messageDetails; break;
        }
        $('#messages').text(message);
    }

    /*************************
     * _displayDialog
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
    async _displayDialog(dialogOptions) {
        let $modal = $('#modal').html(dialogOptions.template);
        let $modalBackdrop = $('#modal-backdrop');
        let $cancelButton = $modal.find('#button-cancel');
        let processContent = dialogOptions.processContent;
        let processContentCB = dialogOptions.processContentCallback;

        processContentCB ? await processContent(processContentCB) : await processContent();

        $modal.show();
        $modalBackdrop.show();
        if ($cancelButton) {
            $cancelButton.click(() => {
                this._hideWarning('#modal .warning');
                $modal.hide();
                $modalBackdrop.hide();
            });
        }
        $modal.find('#button-primary').click(async () => {
            let inputValid = null;
            if (dialogOptions.processInput) {
                inputValid = await dialogOptions.processInput();
            }
            if (inputValid || inputValid === null) {
                this._hideWarning('#modal .warning');
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
