class UI {
    constructor(player, table, audio) {
        // player object format:
        // {userId: string,
        //  userInfo: {gameIds: array, loggedIn: boolean}
        // }
        this.player = player;

        this.game = {
            name: '',
            gameId: ''
        };
        this.table = table;
        this.board = null;
        this.audio = audio;

        this.tempPaths = {
            createGame: 'html/create_game_modal.html',
            joinGame: 'html/join_game_modal.html',
            userInfo: 'html/user-info-modal.html',
            blackMarket: 'html/black-market-modal.html'
        };
        this.$templates = {};
        this._loadTemplates();

        // bindings for callbacks
        this._getPlayerInfo = this._getPlayerInfo.bind(this);
        this._keystrokeListener = this._keystrokeListener.bind(this);
        this._processGameNameEntry = this._processGameNameEntry.bind(this);
        this._displayWarning = this._displayWarning.bind(this);
        this._hideWarning = this._hideWarning.bind(this);
        this._renderGameList = this._renderGameList.bind(this);
        this.updateGame = this.updateGame.bind(this);
        this.table.joinGame = this.table.joinGame.bind(this.table);
        this.table.createGame = this.table.createGame.bind(this.table);
        this.table.getFullGameList = this.table.getFullGameList.bind(this.table);
        this.player.buyAddon = this.player.buyAddon.bind(this.player);

        // Initial setup functions
        this.player.playerLogin(this._postMessage);
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

            if ($button.hasClass('nav-view-info')) {
                dialogOptions = {
                    template: this.$templates.userInfo,
                    processContent: this._getPlayerInfo,
                    processContentParams: {callback: this._renderGameList},
                    processInput: null,
                    callbackParams: {player: this.player, gameData: null, callback: this.updateGame, messageType: 'load-game'},
                    callback: this.table.joinGame
                };
            } else if ($button.hasClass('nav-create-game')) {
                dialogOptions = {
                    template: this.$templates.createGame,
                    processContent: this._keystrokeListener,
                    processContentParams: {formSelector: '#enter-game-name', warningSelector: '#modal .error'},
                    processInput: this._processGameNameEntry,
                    callbackParams: {player: this.player, gameData: null, callback: this.updateGame, messageType: 'create-game'},
                    callback: this.table.createGame
                };
            } else if ($button.hasClass('nav-join-game')) {
                dialogOptions = {
                    template: this.$templates.joinGame,
                    processContent: this.table.getFullGameList,
                    processContentParams: {userId: this.player.userId, callback: this._renderGameList},
                    processInput: null,
                    callbackParams: {player: this.player, gameData: null, callback: this.updateGame, messageType: 'join-game'},
                    callback: this.table.joinGame
                };
            } else if ($button.hasClass('nav-black-market')) {
                dialogOptions = {
                    template: this.$templates.blackMarket,
                    processContent: this.table.getAddons,
                    processContentParams: {userId: this.player.userId, callback: this._renderGameList},
                    processInput: null,
                    callbackParams: {player: this.player, gameData: null, callback: this.updateGame, messageType: 'buy-addon'},
                    callback: this.player.buyAddon
                };
            }
            this._displayDialog(dialogOptions);
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

    _keystrokeListener(selectors) {
        let $textField = $(selectors.formSelector);
        $textField.val('');
        $textField.keydown(() => {
            this._hideWarning(selectors.warningSelector);
        });
    };

    /*************************
     * _processGameNameEntry
     * processInput function for _displayDialog
     * Gets game name user entered, checks that it's long enough and isn't already taken,
     * then returns true above are true, which then allows _displayDialog to continue;
     * or returns false if either above is false, which then prevents _displayDialog from continuing.
     *
     * @returns boolean
     *
     * @private
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
                messageType: 'server-error',
                messageDetails: error
            });
        });

        return isValid;
    }

    _isNameAvailable(nameToCheck) {
        return new Promise((resolve, reject) => {
            this.table.getFullGameList({userId: this.player.userId, callback: (gameList) => {
                for (let game in gameList) {
                    if (gameList.hasOwnProperty(game) && gameList[game].name === nameToCheck) {
                        resolve(false);
                    }
                }
                resolve(true);
            }});
        });
    }

    _displayWarning(selector) {
        $(selector).show();
    }

    _hideWarning(selector) {
        $(selector).hide();
    }

    _getPlayerInfo(params) {
        this.player.getInfo(async (results) => {
            this.player.userInfo = await results;
            if (params.callback) {
                params.callback();
            }
        });
    }

    /*************************
     * _renderGameList
     * Inserts game list data into markup template for display in either game list modal or user account modal
     *
     * processContent callback for _getPlayerInfo
     *
     * @param gameList: array of objects: {creator: string, gameId: string, name: string, playerCount: int, playerIds: array of strings}
     *
     * @private
     *************************/
    _renderGameList(gameList = this.player.userInfo.gameIds) {
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
     * @param gameData.creator: string
     * @param gameData.board: object (new Board)
     * @param gameData.name: string
     * @param gameData.playerCount: int
     * @param gameData.playerIds: array of strings
     * @param gameData.sets: array of strings
     *************************/
    updateGame(gameData, messageType) {
        let boardAction = '';
        let playerIsCreator = gameData.creator === this.player.userId;

        if (gameData.board) {
            this.board = gameData.board;
            this.board.updateBoard = this.board.updateBoard.bind(this.board);
            this.board.initBoardListeners(this._postMessage, playerIsCreator);
        }
        if (messageType && (messageType === 'join-game' || messageType === 'create-game' || messageType === 'load-game')) {
            boardAction = messageType;
        }
        this.board.updateBoard(gameData, boardAction);

        if (messageType) {
            this._postMessage({gameData, messageType});
        }
    }

    /*************************
     * _postMessage
     * Displays message in sidebar
     *
     * @param payload.messageType: string
     * @param payload.messageDetails: string or null depending on server response
     * @param payload.gameData.playerId: string
     *
     * @private
     ************************/
    _postMessage(payload) {
        let messageKey = payload.messageType || null;
        let messageDetails = payload.messageDetails || null;
        let gameData = payload.gameData || null;
        let $message = $(document.createElement('div'));

        $message.addClass('log-message');
        switch(messageKey) {
            case 'login': $message.text(`Login successful`); break;
            case 'login-failed': $message.text(`Login failed due to: ${messageDetails}`); break;
            case 'create-game': $message.text(`${gameData.name} created by ${gameData.creator}`); break;
            case 'join-game': $message.text(`${gameData.player} has joined ${gameData.name}`); break;
            case 'load-game': $message.text(`${gameData.name} loaded`); break;
            case 'already-in-game': $message.text('You are already a player in that game!'); break;
            case 'game-starting': $message.text('The game is starting!'); break;
            case 'server-error': $message.text(`An error has occurred: ${messageDetails}`); break;
            case 'game-message': $message.text(messageDetails); break;
        }
        $('#messages').append($message);
    }

    /*************************
     * _displayDialog
     * Accepts a set of options to determine modal content, user interaction processing,
     * and data and callback to send to destination
     *
     * @param dialogOptions.template: string - path to template file
     * @param dialogOptions.content: function
     * @param dialogOptions.callbackParams: object
     * @param dialogOptions.callback: function - action to take when non-cancel button is pressed
     *
     * @private
     *************************/
    async _displayDialog(dialogOptions) {
        let $modal = $('#modal').html(dialogOptions.template);
        let $modalBackdrop = $('#modal-backdrop');
        let $cancelButton = $modal.find('#button-cancel');
        let processContent = dialogOptions.processContent;
        let processContentParams = dialogOptions.processContentParams;

        await processContent(processContentParams);

        $modal.show();
        $modalBackdrop.show();
        if ($cancelButton) {
            $cancelButton.click(() => {
                this._hideWarning('#modal .wait-text,.error-text');
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
                this._hideWarning('#modal .wait-text,.error-text');
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
