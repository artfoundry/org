class Table {
    constructor(socket) {
        this.socket = socket;
        this.playerId = null;
        this.game = null;
        this.gameId = '';
        this.isBroadcasting = false;
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
        let callback = data.callback;
        let messageType = data.messageType;

        this.playerId = data.player.userId;
        this.socket.on('created-game', (gameData) => {
            this.game = gameData;
            this.gameId = gameData.gameId;
            if (!this.isBroadcasting) {
                this.setUpGameBroadcaster('other-joined-game', callback);
                this.isBroadcasting = true;
            }
            this.socket.off('created-game');
            callback(gameData, messageType);
        });

        this.socket.emit(messageType, this.playerId, gameName);
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
            this.game = gameData;
            if (!this.isBroadcasting) {
                this.setUpGameBroadcaster('other-joined-game', callback);
                this.isBroadcasting = true;
            }
            this.socket.off('joined-game');
            callback(gameData, messageType);
        });

        this.socket.emit(messageType, this.playerId, this.gameId);
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

    startGame(uiMessageCallback) {
        this.initGameListeners(uiMessageCallback);
        this.socket.emit('start-game', this.gameId);
    }

    initGameListeners(uiMessageCallback) {
        let messagePackage = {
            gameData: this.game
        };

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
