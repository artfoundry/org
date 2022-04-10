import {Helpers} from './helpers.js';

class UI {
    constructor(controller) {
        this.controller = controller;
        this.helpers = new Helpers();

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
        this._renderPlayerInfo = this._renderPlayerInfo.bind(this);
        this._displayWarning = this._displayWarning.bind(this);
        this._hideWarning = this._hideWarning.bind(this);
        this._renderGameList = this._renderGameList.bind(this);
        this._renderSetList = this._renderSetList.bind(this);
        this._openModal = this._openModal.bind(this);
        this.controllerReqPlayerData = this.controller.getPlayerFromServer.bind(this.controller);
        this.controllerPlayerStoredData = this.controller.getStoredPlayerData.bind(this.controller);
        this.controllerSetupForm = this.controller.setupCreateGameForm.bind(this.controller);
        this.controllerProcessForm = this.controller.processCreateGameForm.bind(this.controller);
        this.controllerGetCallback = this.controller.getCallbackFunction.bind(this.controller);
        this.controllerUpdateGameData = this.controller.updateGameData.bind(this.controller);
        this.controllerUpdateBoard = this.controller.updateGameBoard.bind(this.controller);
        this.controllerGameStoredData = this.controller.getStoredGameData.bind(this.controller);

        // Initial setup functions
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
        let userId = this.controllerPlayerStoredData('userId');

        $mainNav.click((evt)=> {
            let $button = $(evt.target);
            let dialogOptions = {};
            let populateUserID = (templateName) => {
                let $templateToPopulate = $(this.$templates[templateName]);
                $templateToPopulate.find('.user-id').text(userId);
                return $templateToPopulate;
            };

            this._navButtonToggle($button);

            if ($button.hasClass('nav-view-account')) {
                dialogOptions = {
                    template: populateUserID('userInfo'),
                    focus: null,
                    processContent: this.controllerReqPlayerData,
                    processContentParams: {userId: userId, callback: this._renderPlayerInfo},
                    processInput: null,
                    callback: null,
                    callbackParams: {player: this.controllerPlayerStoredData(), gameData: null, callback: null, messageType: null}
                };
            } else if ($button.hasClass('nav-create-game')) {
                dialogOptions = {
                    template: this.$templates.createGame,
                    focus: '#modal .text-line-entry',
                    processContent: this.controllerSetupForm,
                    processContentParams: {setSelector: '.create-game-sets', keyListenerSelectors: {formSelector: '#create-modal-enter-game-name', warningSelector: '#modal .error'}, callback: this._renderSetList},
                    processInput: this.controllerProcessForm,
                    callback: this.controllerGetCallback('table', 'createGame'),
                    callbackParams: {player: this.controllerPlayerStoredData(), gameData: null, callback: this.controllerUpdateBoard, messageType: 'create-game'}
                };
            } else if ($button.hasClass('nav-join-game')) {
                dialogOptions = {
                    template: this.$templates.joinGame,
                    focus: null,
                    processContent: this.controllerGetCallback('table', 'getFullGameList'),
                    processContentParams: {userId: userId, callback: this._renderGameList},
                    processInput: null,
                    callback: this.controllerGetCallback('table', 'joinGame'),
                    callbackParams: {player: this.controllerPlayerStoredData(), gameData: null, callback: this.controllerUpdateBoard, messageType: 'join-game'}
                };
            } else if ($button.hasClass('nav-user-games')) {
                dialogOptions = {
                    template: populateUserID('userGames'),
                    focus: null,
                    processContent: this.controllerReqPlayerData,
                    processContentParams: {joined: true, callback: this._renderGameList},
                    processInput: null,
                    callback: this.controllerGetCallback('table', 'joinGame'),
                    callbackParams: {player: this.controllerPlayerStoredData(), gameData: null, callback: this.controllerUpdateGameData, messageType: 'load-game'}
                };
            } else if ($button.hasClass('nav-black-market')) {
                // replace these callbacks once getAddons() is finished
                let tempDisplayFunc = ()=> {console.log('display black market');};
                let tempActionFunc = ()=> {console.log('buy addon');};
                dialogOptions = {
                    template: this.$templates.blackMarket,
                    focus: null,
                    processContent: this.controllerGetCallback('table', 'getAddons'),
                    processContentParams: {userId: userId, callback: tempDisplayFunc},
                    processInput: null,
                    callback: this.controllerGetCallback('player', 'buyAddon'),
                    callbackParams: {player: this.controllerPlayerStoredData(), gameData: null, callback: tempActionFunc, messageType: 'buy-addon'}
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
        $tempContainer.remove();
    }

    keystrokeListener(selectors) {
        let $textField = $(selectors.formSelector);
        $textField.val('');
        $textField.keydown(() => {
            this._hideWarning(selectors.warningSelector);
        });
    };

    _displayWarning(selector) {
        $(selector).show();
    }

    _hideWarning(selector) {
        $(selector).hide();
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
     * used as the callback from table.getSetList, initiated by controller.setupCreateGameForm
     *
     * @param: listSelector: $ selector for list of sets
     * @param: setList: Object retrieved from server containing everything in "/set/" (sets of planets)
     *
     * @private
     *************************/
    _renderSetList(data) {
        let setList = data.setList;
        let $setText;
        let ui = this;
        let $setListMarkup = $(data.selector);

        $setListMarkup.html('');
        if (setList) {
            for (let set in setList) {
                if (setList.hasOwnProperty(set)) {
                    let regionList = ui.helpers.capitalize(setList[set].regions);

                    regionList = regionList.map((name) => {return ' ' + name;});
                    if (regionList.length > 1) {
                        regionList[regionList.length-1] = ' and' + regionList[regionList.length-1];
                    }
                    $setText = $(document.createElement('div')).addClass('set-list-row').attr('tabindex', '0').html(`
                        <span class="no-pointer-events set-list-set-name" data-region-set="${set}">${set}</span>
                        <div class="no-pointer-events">
                            <div class="set-list-regions">${regionList}</div>
                            <div>${setList[set].description}</div>
                        </div>
                    `);
                    $setText.click(function() {
                        let $prevSelected = $('.game-list-row-selected');
                        let gameSetData = $(this).children()[0].getAttribute('data-region-set');

                        if ($(this).hasClass('game-list-row-selected')) {
                            $(this).removeClass('game-list-row-selected');
                            $('.modal-button-primary').addClass('disabled');
                            ui.controllerUpdateGameData({set: ''});
                        } else {
                            if ($prevSelected.length > 0) {
                                $prevSelected.removeClass('game-list-row-selected');
                            }
                            $(this).addClass('game-list-row-selected');
                            $('.modal-button-primary').removeClass('disabled');
                            ui.controllerUpdateGameData({set: gameSetData});
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
                if (game.isRunning || game.currentTurn === 0) {
                    let resignButton = joinedGame ? `<button class="button game-resign-button" data-gameid="${game.gameId}" data-gamename="${game.name}">Resign</button>\n` : '';
                    let turnDisplay = game.isRunning ? game.currentTurn : 'Not started yet';
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
                }
            });

            $('.game-join-button, .game-resign-button').click(function(e) {
                let button = e.currentTarget.textContent;
                let newGameData = {name: $(this).data('gamename'), gameId: $(this).data('gameid')};
                // To be used if player is resigning a game
                let redrawUserGames = ()=> {
                    ui.controllerReqPlayerData({joined: true, callback: ui._renderGameList});
                };

                $('.game-join-button, .game-resign-button').off('click');
                ui._hideWarning('#modal .wait-text,.error-text');

                // Update the local game data with name and ID of the chosen game
                ui.controllerUpdateGameData(newGameData);

                // to be passed to resignGame or joinGame
                let userActionData = {
                    player: ui.controllerPlayerStoredData(),
                    gameData: ui.controllerGameStoredData(),
                    callback: button === 'Resign' ? redrawUserGames : ui.controllerUpdateBoard,
                    messageType: button === 'Resign' ? 'resign-game' : joinedGame ? 'load-game' : 'join-game'
                };
                if (button === 'Resign') {
                    let resignGame = ui.controllerGetCallback('table', 'resignGame');
                    resignGame(userActionData);
                } else {
                    $('#modal').hide();
                    $('#modal-backdrop').hide();
                    $('#game-content').show();
                    ui._navButtonToggle();
                    let joinGame = ui.controllerGetCallback('table', 'joinGame');
                    joinGame(userActionData);
                }
            });
        }
    }

    /*************************
     * postMessage
     * Displays message in log/chat window
     *
     * @param payload.messageType: string
     * @param payload.messageDetails: string or null depending on server response
     * @param payload.updateData: object
     *************************/
    postMessage(payload) {
        let messageKey = payload.messageType;
        let messageDetails = payload.messageDetails;
        let playerName = payload.player;
        let gameData = payload.updateData;
        let gameName = gameData && gameData.name;
        let creator = gameData && gameData.creator;
        let otherPlayer = gameData && gameData.userId;
        let $message = $(document.createElement('div'));

        $message.addClass('log-message');
        switch(messageKey) {
            case 'login': $message.text(`Logged in as ${playerName}`); break;
            case 'login-failed': $message.text(messageDetails); break;
            case 'create-game': $message.text(`${gameName} created by ${creator}`); break;
            case 'join-game': $message.text(`You joined ${gameName}`); break;
            case 'other-joined-game': $message.text(`${otherPlayer} joined ${gameName}`); break;
            case 'resign-game': $message.text(`You have resigned ${gameName}`); break;
            case 'other-resigned-game': $message.text(`${otherPlayer} has resigned ${gameName}`); break;
            case 'load-game': $message.text(`${gameName} loaded`); break;
            case 'already-in-game': $message.text('You are already a player in that game!'); break;
            case 'game-setup': $message.text('Setting up the game...'); break;
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
                    dialogOptions.callbackParams.gameData = this.controllerGameStoredData();
                    dialogOptions.callback(dialogOptions.callbackParams);
                }
            }
        });
    }
}

export { UI };
