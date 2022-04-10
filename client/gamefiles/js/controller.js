import {UI} from "./ui.js";
import {Table} from "./table.js";
import {Game} from "./game.js";

class Controller {
    constructor(player, socket) {
        // player object format for reference:
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
        this.table = new Table(this.socket);
        this.game = null;
        this.ui = new UI(this);

        // bindings for callbacks
        this.table.joinGame = this.table.joinGame.bind(this.table);
        this.table.createGame = this.table.createGame.bind(this.table);
        this.table.getFullGameList = this.table.getFullGameList.bind(this.table);
        this.player.buyAddon = this.player.buyAddon.bind(this.player);
        this.ui.postMessage = this.ui.postMessage.bind(this.ui);

        // Initial setup functions
        this.player.playerLogin(this.ui.postMessage);
    }

    setupCreateGameForm(params) {
        this.table.getSetList({selector: params.setSelector, callback: params.callback});
        this.ui.keystrokeListener(params.keyListenerSelectors);
    }

    /*************************
     * processGameNameEntry
     * processInput function for _displayDialog
     * Gets game name user entered, checks that it's long enough and isn't already taken,
     * then returns true above are true, which then allows _displayDialog to continue;
     * or returns false if either above is false, which then prevents _displayDialog from continuing.
     *
     * @returns boolean
     *************************/
    async processCreateGameForm() {
        let gameName = $('#create-modal-enter-game-name').val();
        let isValid = null;

        this.ui._displayWarning('#modal .wait-text');
        await this._isNameAvailable(gameName).then((nameIsAvailable) => {
            this.ui._hideWarning('#modal .wait-text');
            if (gameName && gameName.length >= 3 && nameIsAvailable) {
                this.gameData.name = gameName;
                isValid = true;
            } else {
                this.ui._displayWarning('#modal .error-text');
                isValid = false;
            }
        }).catch((error) => {
            this.ui._hideWarning('#modal .wait-text');
            this.ui.postMessage({
                messageType: 'server-error',
                messageDetails: error
            });
        });

        return isValid;
    }

    _isNameAvailable(nameToCheck) {
        return new Promise((resolve) => {
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

    getPlayerFromServer(params) {
        this.player.getInfo().then((playerData) => {
            if (params.joined)
                playerData['joined'] = params.joined;
            if (params.callback)
                params.callback(playerData);
        });
    }

    getStoredPlayerData(item) {
        return item ? this.player[item] : this.player;
    }

    /*************************
     * getCallbackFunction
     * Retrieves a function from one of the other Classes to be used as a callback
     *
     * @param cls: string (name of the class)
     * @param func: string (name of the class's function)
     *************************/
    getCallbackFunction(cls, func) {
        return this[cls][func].bind(this[cls]);
    }

    /*************************
     * updateGameData
     * Updates gameData storage in controller
     *
     * @param gameData: object
     *************************/
    updateGameData(gameData) {
        for (let item in gameData) {
            if (gameData.hasOwnProperty(item)) {
                this.gameData[item] = gameData[item];
            }
        }
    }

    getStoredGameData(item) {
        return item ? this.gameData[item] : this.gameData;
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
    updateGameBoard(updateData, messageType) {
        if (!this.game || this.game.gameData.gameId !== updateData.gameId) {
            this.createGame(updateData);
        }
        this.game.updateBoard(messageType, updateData);
        this.ui.postMessage({updateData, messageType});
    }

    createGame(gameData) {
        this.game = new Game(this.table, this.player, this.ui.postMessage, gameData);
        this.game.updateBoard = this.game.updateBoard.bind(this.game);
        this.updateGameData(gameData);
    }

}

export { Controller };
