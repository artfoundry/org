class Table {
    constructor(socket) {
        this.socket = socket;
        this.playerId = null;
        this.game = null;
        this.gameData = null;
        this.gameId = '';
        this.gameSet = '';
        this.gameBoards = null;
        this.isBroadcasting = false;
    }

    /*************************
     * getSetList
     * Calls server to get list of game sets in database
     *
     * @param data.selector: string
     * @param data.callback: function
     *************************/
    getSetList(data) {
        let selector = data.selector;
        let callback = data.callback;

        this.socket.on('set-list-retrieved', (setList) => {
            this.socket.off('set-list-retrieved');
            callback(selector, setList);
        });

        this.socket.emit('get-set-list');
    }

    /*************************
     * getFullGameList
     * Calls server to get list of available games in database
     *
     * @param data.userId: string
     * @param data.callback: function
     *************************/
    getFullGameList(data) {
        let userId = data.userId;
        let callback = data.callback;

        this.socket.on('game-list-retrieved', (gameList) => {
            this.socket.off('game-list-retrieved');
            callback(gameList);
        });

        this.socket.emit('get-game-list', userId);
    }

    /***********************
     * createGame
     * Sends game name and user ID to server and waits for signal game has been created and assigned
     * @param data.player: object
     * @param data.gameData: object
     * @param data.callback: function
     * @param data.messageType: string
     ***********************/
    createGame(data) {
        let gameName = data.gameData.name;
        let gameSet = data.gameData.set;
        let callback = data.callback;
        let messageType = data.messageType;

        this.playerId = data.player.userId;
        this.socket.on('created-game', (gameData) => {
            this.initGame(gameData, callback);
            this.socket.off('created-game');
            callback(gameData, messageType);
        });
        this.socket.emit(messageType, this.playerId, gameName, gameSet);
    }

    /************************
     * joinGame
     * Sends gameId and player ID to server and waits for signal player has joined
     * Used for joining new game or resuming game already joined
     * @param data.player: object
     * @param data.gameData: object
     * @param data.callback: function
     * @param data.messageType: string
     ************************/
    joinGame(data) {
        let callback = data.callback;
        let messageType = data.messageType;

        this.playerId = data.player.userId;
        this.gameId = data.gameData.gameId;
        this.socket.on('joined-game', (gameData) => {
            this.initGame(gameData, callback);
            this.socket.off('joined-game');
            if (this.gameData.isRunning) {
                this.game.updateGame(this.gameData, 'load-game');
            }
            callback(gameData, messageType);
        });

        this.socket.emit(messageType, this.playerId, this.gameId);
    }

    initGame(gameData, callback) {
        this.gameData = gameData;
        this.gameId = gameData.gameId;
        this.gameSet = gameData.set.name;
        this.gameBoards = gameData.set.regions;
        if (!this.isBroadcasting) {
            this.setUpGameBroadcaster('other-joined-game', callback);
            this.isBroadcasting = true;
        }
    }

    setUpGameBroadcaster(messageType, messageCallback) {
        if (messageType === 'other-joined-game') {
            this.socket.on(messageType, (updateData) => {
                if (updateData.gameId === this.gameId && updateData.userId !== this.playerId) {
                    messageCallback(updateData, messageType);
                }
            });
        }
    }

    startGame(game, uiMessageCallback) {
        this.game = game;
        this.initTableListeners(uiMessageCallback);
        this.socket.emit('start-game', this.gameId, this.gameBoards);
    }

    initTableListeners(uiMessageCallback) {
        let messagePackage = {
            gameData: this.gameData
        };

        this.socket.on('card-data', (data) => {
            this.game.storeCards(data);
        });

        this.socket.on('game-message', (message) => {
            messagePackage.messageDetails = message;
            messagePackage.messageType = 'game-message';
            uiMessageCallback(messagePackage);
        });

        this.socket.on('game-starting', ()=> {
            messagePackage.messageType = 'game-starting';
            uiMessageCallback(messagePackage);
        });
    }

    /*************************
     * getAddons
     *
     * @param data.userId: string
     * @param data.callback: function
     *************************/
    getAddons(data) {

    }
}
