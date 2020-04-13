class Table {
    constructor(socket) {
        this.socket = socket;
        this.game = null;
        this.gameId = '';
        this.board = null;
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
        let playerId = data.player.userId;
        let gameName = data.gameData.name;
        let callback = data.callback;
        let messageType = data.messageType;

        this.socket.on('assigned-game', (gameData) => {
            this.game = gameData;
            this.gameId = gameData.gameId;
            this.createBoard();
            gameData.board = this.board;
            callback(gameData, messageType);
        });

        this.socket.emit('create-game', playerId, gameName);
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
        let playerId = data.player.userId;
        let callback = data.callback;
        let messageType = data.messageType;

        this.gameId = data.gameData.gameId;
        this.socket.on('joined-game', (gameData) => {
            this.game = gameData;
            this.createBoard();
            gameData.board = this.board;
            callback(gameData, messageType);
        });

        this.socket.on('other-player-joined', (updateData) => {
            if (this.board && updateData.update.gameId === this.gameId && updateData.userId !== playerId) {
                this.board.updateOtherPlayer(updateData.userId, updateData.update.inGame);
            }
        });

        this.socket.emit(messageType, playerId, this.gameId);
    }

    createBoard() {
        this.board = new Board(this);
    }

    startGame(uiMessageCallback) {
        this.initGameListeners(uiMessageCallback);
        this.socket.on('game-starting', ()=> {
            let messagePackage = {
                gameData: this.game,
                messageType: 'game-starting'
            };
            uiMessageCallback(messagePackage);
        });
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
