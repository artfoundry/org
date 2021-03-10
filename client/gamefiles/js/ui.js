import {Game} from './game.js';

class UI {
    constructor(player, table, helpers, socket) {
        // player object format:
        // {
        //      userId: string,
        //      userInfo: {
        //          loggedIn: false,
        //          account: accountInfo,
        //          inGame: false,
        //          gameIds: [],
        //          games: []
        //      }
        // }
        this.player = player;
        this.socket = socket;

        this.gameData = {
            name: '',
            gameId: '',
            set: ''
        };
        this.table = table;
        this.game = null;
        this.helpers = helpers;

        this.tempPaths = {
            createGame: 'html/create-game-modal.html',
            joinGame: 'html/join-game-modal.html',
            userGames: 'html/user-games-modal.html',
            userInfo: 'html/user-info-modal.html',
            blackMarket: 'html/black-market-modal.html'
        };
        this.$templates = {};
        this._loadTemplates();

        // bindings for callbacks
        this._getPlayerInfo = this._getPlayerInfo.bind(this);
        this._renderPlayerInfo = this._renderPlayerInfo.bind(this);
        this._renderCreateGameForm = this._renderCreateGameForm.bind(this);
        this._processCreateGameForm = this._processCreateGameForm.bind(this);
        this._displayWarning = this._displayWarning.bind(this);
        this._hideWarning = this._hideWarning.bind(this);
        this._renderGameList = this._renderGameList.bind(this);
        this._renderSetList = this._renderSetList.bind(this);
        this._openModal = this._openModal.bind(this);
        this.updateGame = this.updateGame.bind(this);
        this.table.joinGame = this.table.joinGame.bind(this.table);
        this.table.createGame = this.table.createGame.bind(this.table);
        this.table.getFullGameList = this.table.getFullGameList.bind(this.table);
        this.player.buyAddon = this.player.buyAddon.bind(this.player);
        this.player.getInfo = this.player.getInfo.bind(this.player);

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
     * - processContentParams object with different params depending on the processContent function
     * - processInput function to process data to send to server (that needs to be checked, and if error, error displayed on modal
     * - callbackParams object with player name, game id or name, display callback, and action type message to send to server
     * - callback function for user action, such as joining or creating a game
     * @private
     */
    _initNav() {
        let $mainNav = $('#main-nav');
        $mainNav.click((evt)=> {
            let $button = $(evt.target);
            let dialogOptions = {};
            let populateUserID = (templateName) => {
                let $templateToPopulate = $(this.$templates[templateName]);
                $templateToPopulate.find('.user-id').text(this.player.userId);
                return $templateToPopulate;
            };

            this._navButtonToggle($button);

            if ($button.hasClass('nav-view-account')) {
                dialogOptions = {
                    template: populateUserID('userInfo'),
                    focus: null,
                    processContent: this._getPlayerInfo,
                    processContentParams: {userId: this.player.userId, callback: this._renderPlayerInfo},
                    processInput: null,
                    callback: null,
                    callbackParams: {player: this.player, gameData: null, callback: null, messageType: null}
                };
            } else if ($button.hasClass('nav-create-game')) {
                dialogOptions = {
                    template: this.$templates.createGame,
                    focus: '#modal .text-line-entry',
                    processContent: this._renderCreateGameForm,
                    processContentParams: {setSelector: '.create-game-sets', keyListenerSelectors: {formSelector: '#create-modal-enter-game-name', warningSelector: '#modal .error'}},
                    processInput: this._processCreateGameForm,
                    callback: this.table.createGame,
                    callbackParams: {player: this.player, gameData: null, callback: this.updateGame, messageType: 'create-game'}
                };
            } else if ($button.hasClass('nav-join-game')) {
                dialogOptions = {
                    template: this.$templates.joinGame,
                    focus: null,
                    processContent: this.table.getFullGameList,
                    processContentParams: {userId: this.player.userId, callback: this._renderGameList},
                    processInput: null,
                    callback: this.table.joinGame,
                    callbackParams: {player: this.player, gameData: null, callback: this.updateGame, messageType: 'join-game'}
                };
            } else if ($button.hasClass('nav-user-games')) {
                dialogOptions = {
                    template: populateUserID('userGames'),
                    focus: null,
                    processContent: this._getPlayerInfo,
                    processContentParams: {joined: true, callback: this._renderGameList},
                    processInput: null,
                    callback: this.table.joinGame,
                    callbackParams: {player: this.player, gameData: null, callback: this.updateGame, messageType: 'load-game'}
                };
            } else if ($button.hasClass('nav-black-market')) {
                dialogOptions = {
                    template: this.$templates.blackMarket,
                    focus: null,
                    processContent: this.table.getAddons,
                    processContentParams: {userId: this.player.userId, callback: this._renderGameList},
                    processInput: null,
                    callback: this.player.buyAddon,
                    callbackParams: {player: this.player, gameData: null, callback: this.updateGame, messageType: 'buy-addon'}
                };
            }
            this._displayDialog(dialogOptions);
        });
    }

    _navButtonToggle($button = null) {
        let $previousButton = $('#main-nav').find('.button-selected');

        if ($previousButton) {
            $previousButton.removeClass('button-selected');
        }
        if ($button) {
            $button.addClass('button-selected');
        }
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

    _renderCreateGameForm(selectors) {
        this.table.getSetList({selector: selectors.setSelector, callback: this._renderSetList});
        this._keystrokeListener(selectors.keyListenerSelectors);
    }

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
    async _processCreateGameForm() {
        let gameName = $('#create-modal-enter-game-name').val();
        let isValid = null;

        this._displayWarning('#modal .wait-text');
        await this._isNameAvailable(gameName).then((nameIsAvailable) => {
            this._hideWarning('#modal .wait-text');
            if (gameName && gameName.length >= 3 && nameIsAvailable) {
                this.gameData.name = gameName;
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

    async _getPlayerInfo(params) {
        let playerData = await this.player.getInfo();

        if (params.joined)
            playerData['joined'] = params.joined;
        params.callback(playerData);
    }

    _renderPlayerInfo(userInfo) {
        let $userInfo = $('.user-info');

        $userInfo.html('');
        for (let info in userInfo.account) {
            if (userInfo.account.hasOwnProperty(info)) {
                $userInfo.append(`<div>${info}: ${userInfo.account[info]}</div>`);
            }
        }
    }

    /*************************
     * _renderSetList
     * Inserts planet set list data into markup for display in Create New Game screen
     *
     * this.table.getSetList callback in this._renderCreateGameForm
     *
     * @param: listSelector: $ selector for list of sets
     * @param: setList: Object retrieved from server containing everything in "/set/" (sets of planets)
     *
     * @private
     *************************/
    _renderSetList(listSelector, setList) {
        let $setText;
        let ui = this;
        let $setListMarkup = $(listSelector);

        $setListMarkup.html('');
        if (setList) {
            for (let set in setList) {
                if (setList.hasOwnProperty(set)) {
                    let regionList = this.helpers.capitalize(setList[set].regions);

                    regionList = regionList.map((name) => {return ' ' + name;});
                    if (regionList.length > 1) {
                        regionList[regionList.length-1] = ' and' + regionList[regionList.length-1];
                    }
                    $setText = $(document.createElement('div')).addClass('set-list-row').attr('tabindex', '0').html(`
                        <span class="no-pointer-events set-list-set-name" data-set="${set}">${set}</span>
                        <div class="no-pointer-events">
                            <div class="set-list-regions">${regionList}</div>
                            <div>${setList[set].description}</div>
                        </div>
                    `);
                    $setText.click(function() {
                        let $prevSelected = $('.game-list-row-selected');
                        let gameSetEl = $(this).children()[0];

                        if ($(this).hasClass('game-list-row-selected')) {
                            $(this).removeClass('game-list-row-selected');
                            $('.modal-button-primary').addClass('disabled');
                            ui.gameData = {
                                set: ''
                            };
                        } else {
                            if ($prevSelected.length > 0) {
                                $prevSelected.removeClass('game-list-row-selected');
                            }
                            $(this).addClass('game-list-row-selected');
                            $('.modal-button-primary').removeClass('disabled');
                            ui.gameData = {
                                set: gameSetEl.getAttribute('data-set')
                            };
                        }
                    });
                    $setListMarkup.append($setText);
                }
            }
            $setListMarkup.children('.game-list-row').first().focus();
        }
    }

    /*************************
     * _renderGameList
     * Inserts game list data into markup template for display in either avail games screen or user games screen
     *
     * processContent callback for this._getPlayerInfo
     *
     * @param: gameList: Object from server containing all games currently running
     *
     * @private
     *************************/
    _renderGameList(data) {
        let gameList = data.games;
        let joinedGame = data.joined;
        let joinResumeButtonLabel = joinedGame ? 'Resume' : 'Join';
        let $gameText;
        let ui = this;
        let $gameListMarkup = $('#modal .game-list');

        $gameListMarkup.html('');
        if (gameList.length === 0) {
            $gameText = $(document.createElement('div')).addClass('game-list-row-nogames').html(`
                <span class="game-list-text">No games available</span>
            `);
            $gameListMarkup.append($gameText);
            $('.modal-button-cancel').focus();
        } else {
            gameList.forEach((game) => {
                let resignButton = joinedGame ? `<button class="button game-resign-button" data-gameid="${game.gameId}" data-gamename="${game.name}">Resign</button>\n` : '';
                let turnDisplay = game.currentTurn === 0 ? 'Not started yet' : game.currentTurn;
                let gameTurn = joinedGame ? `<span class="game-list-text">${turnDisplay}</span>` : '';

                $gameText = $(document.createElement('div')).addClass('game-list-row').attr('tabindex', '0').html(`
                    <span class="game-list-text game-list-text-name">${game.name}</span>
                    <span class="game-list-text">${game.creator}</span>
                    <span class="game-list-text">${game.set.name}</span>
                    <span class="game-list-text">${game.playerCount}</span>
                    ${gameTurn}
                    <button class="button game-join-button" data-gameid="${game.gameId}" data-gamename="${game.name}">${joinResumeButtonLabel}</button>
                    ${resignButton}
                `);
                $gameListMarkup.append($gameText);
            });

            $('.game-join-button, .game-resign-button').click(function() {
                ui.gameData = {
                    name: $(this).data('gamename'),
                    gameId: $(this).data('gameid')
                };
                let gameData = {
                    player: ui.player,
                    gameData: ui.gameData,
                    callback: ui.updateGame,
                    messageType: joinedGame ? 'load-game' : 'join-game'
                };

                $('.game-join-button, .game-resign-button').off('click');
                ui._hideWarning('#modal .wait-text,.error-text');
                $('#modal').hide();
                $('#modal-backdrop').hide();
                ui._navButtonToggle();
                joinedGame ? ui.table.joinGame(gameData) : ui.table.resignGame(gameData);
            });
        }
    }

    /*************************
     * updateGame
     * callbackParams callback function for _displayDialog
     *
     * @param updateData.gameId: string
     * @param updateData.creator: string
     * @param updateData.name: string
     * @param updateData.playerCount: int
     * @param updateData.playerIds: array of strings
     * @param updateData.sets: array of strings
     * @param updateData.isRunning: boolean
     *************************/
    updateGame(updateData, messageType) {
        if (!this.game || this.game.gameData.gameId !== updateData.gameId) {
            this.createGame(updateData); // this will cause 'load-game' message to fire from this.game
        } else if (messageType) {
            this._postMessage({updateData, messageType});
        }
    }

    createGame(gameData) {
        this.game = new Game(this.table, this.player, this._postMessage, gameData);
    }

    /*************************
     * _postMessage
     * Displays message in sidebar
     *
     * @param payload.messageType: string
     * @param payload.messageDetails: string or null depending on server response
     * @param payload.updateData: object
     * @param payload.
     *
     * @private
     ************************/
    _postMessage(payload) {
        let messageKey = payload.messageType;
        let messageDetails = payload.messageDetails;
        let gameData = payload.updateData;
        let gameName = gameData && gameData.name;
        let creator = gameData && gameData.creator;
        let otherPlayer = gameData && gameData.userId;
        let $message = $(document.createElement('div'));

        $message.addClass('log-message');
        switch(messageKey) {
            case 'login': $message.text(`Login successful`); break;
            case 'login-failed': $message.text(messageDetails); break;
            case 'create-game': $message.text(`${gameName} created by ${creator}`); break;
            case 'join-game': $message.text(`You joined ${gameName}`); break;
            case 'other-joined-game': $message.text(`${otherPlayer} joined ${gameName}`); break;
            case 'load-game': $message.text(`${gameName} loaded`); break;
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
     * @param dialogOptions.focus: string - element focus should be applied to upon opening modal
     * @param dialogOptions.processContent: function - for displaying content in modal
     * @param dialogOptions.processContentParams: object
     * @param dialogOptions.processInput: function - for determining user input in modal
     * @param dialogOptions.callback: function - action to take when non-cancel button is pressed
     * @param dialogOptions.callbackParams: object
     *
     * @private
     *************************/
    _displayDialog(dialogOptions) {
        let processContent = dialogOptions.processContent;
        let processContentParams = dialogOptions.processContentParams;
        let processContentCallback = processContentParams.callback || null;
        let $modal = $('#modal').html(dialogOptions.template);

        if (processContentParams.callback) {
            processContentParams.callback = (data) => {
                processContentCallback(data);
                this._openModal($modal, dialogOptions);
            };
            processContent(processContentParams);
        } else {
            processContent(processContentParams);
            this._openModal($modal, dialogOptions);
        }
    }

    _openModal($modal, dialogOptions) {
        let $modalBackdrop = $('#modal-backdrop');
        let $cancelButton = $modal.find('.modal-button-cancel');
        let $primaryButton = $modal.find('.modal-button-primary');

        $modal.show();
        if (dialogOptions.focus) {
            $(dialogOptions.focus).focus();
        }
        $modalBackdrop.show();
        if ($cancelButton) {
            $cancelButton.click(() => {
                this._hideWarning('#modal .wait-text,.error-text');
                $modal.hide();
                $modalBackdrop.hide();
                this._navButtonToggle();
            });
        }
        $primaryButton.click(async () => {
            let inputValid = null;
            if (dialogOptions.processInput) {
                inputValid = await dialogOptions.processInput();
            }
            if (inputValid || inputValid === null) {
                this._hideWarning('#modal .wait-text,.error-text');
                $modal.hide();
                $modalBackdrop.hide();
                $primaryButton.addClass('disabled');
                this._navButtonToggle();
                if (dialogOptions.callback) {
                    dialogOptions.callbackParams.gameData = this.gameData;
                    dialogOptions.callback(dialogOptions.callbackParams);
                }
            }
        });
    }
}

export { UI };
