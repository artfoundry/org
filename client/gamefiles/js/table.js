class Table {
    constructor(socket) {
        this.socket = socket;
        this.game = null;
    }

    /***********************
     * createGame
     * Sends game name and user ID to server and waits for signal game has been created and assigned
     * @param data.player: object
     * @param data.gameName: string
     * @param data.callback: function
     ***********************/
    createGame(data) {
        let player = data.player;
        let gameName = data.gameData.name;
        let callback = data.callback;

        this.socket.on('assigned-game', (gameData) => {
            callback(gameData);
        });

        this.socket.emit('create-game', player.userId, gameName);
    }

    /************************
     * joinGame
     * Sends gameId and player ID to server and waits for signal player has joined
     * @param data.player: object
     * @param data.callback: function
     */
    joinGame(data) {
        let player = data.player;
        let gameId = data.gameData.id;
        let callback = data.callback;

        this.socket.on('joined-game', (gameData) => {
            callback(gameData);
        });

        this.socket.emit('join-game', player.userId, gameId);
        console.log(player.userId + ' joined game');
    }

}
