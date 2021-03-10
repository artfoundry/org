const HTTP_PORT = 4000;
const NUM_GAME_TURNS = 10;

class GameServer {
    constructor(fbServices) {
        this.fbServices = fbServices;
        this.app = require('express')();
        this.http = require('http').createServer(this.app);
        this.io = require('socket.io')(this.http);
        this.socket = null;
    }

    /*************
     * loadComms
     * Starts Express game server, http port listening, io listening, and io socket for communicating with client.
     ************/
    loadComms() {
        this.app.get('/', (req, res) => {
            res.send('Org backend server started');
        });

        this.http.listen(HTTP_PORT, () => console.log(`Org server listening on port ${HTTP_PORT}!`));

        this.io.on('connection', (socket) => {
            console.log('connected to client');

            this.socket = socket;
            this.fbServices._monitorFbConnection(this.socket);

            this.initListeners();
        });
        this.io.on('disconnect', () => {
            // this.fbServices.login(userId, false);
            console.log('disconnected');
        });
    }

    initListeners() {
        // lobby listeners
        this.socket.on('player-login', (userId) => {
            let logMessage = '';

            this.fbServices.login(userId, true).then(() => {
                logMessage = `${userId} logged in`;
                this.emitResponse('login-successful', null, logMessage);
            }).catch((error) => {
                logMessage = `${userId} login failed. Error: ${error.message}`;
                this.emitResponse(error.type, error.message, logMessage);
            });
        });
        // Gets user account info, including games user is in
        this.socket.on('get-user', (userId) => {
            let logMessage = '';
            this.fbServices.getUser(userId).then((results) => {
                logMessage = `Retrieved account info for ${userId}`;
                this.emitResponse('user-info', results, logMessage);
            }).catch((error) => {
                logMessage = `Error retrieving user info: ${error.message}`;
                this.emitResponse(error.type, error.message, logMessage);
            });
        });
        // Adds a new game to the DB and sends game info to the client
        this.socket.on('create-game', (userId, gameName, gameSet) => {
            let logMessage = '';
            this.fbServices.createGame(userId, gameName, gameSet).then((results) => {
                logMessage = `Game ${gameName} created by ${userId}`;
                this.emitResponse('created-game', results, logMessage);
            }).catch((error) => {
                logMessage = `Error creating game: ${error.message}`;
                this.emitResponse(error.type, error.message, logMessage);
            });
        });
        // Adds user to game and gets game info, then notifies all players in game that the user joined
        this.socket.on('join-game', (userId, gameId) => {
            let logMessage = '';
            this.fbServices.joinGame(userId, gameId).then((results) => {
                let updateData = {
                    userId: userId,
                    gameId,
                    name: results.name
                };
                logMessage = userId + ' joined ' + results.name;
                this.emitResponse('joined-game', results, logMessage);
                logMessage = 'Message broadcasted to other players';
                this.emitResponse('other-joined-game', updateData, logMessage);
            }).catch((error) => {
                logMessage = `Error joining game: ${error.message}`;
                this.emitResponse(error.type, error.message, logMessage);
            });
        });
        // Gets game info for a game a user has already joined and is now resuming
        this.socket.on('load-game', (userId, gameId) => {
            let gameInfo;
            let logMessage = '';

            this.fbServices.getGameInfo(gameId).then((gameData) => {
                gameInfo = gameData;
            }).then(() => {
                let params = {key: 'inGame', value: gameId};

                this.fbServices.updateUser(userId, params).catch((error) => {
                    logMessage = `Error updating user info: ${error.message}`;
                    this.emitResponse(error.type, error.message, logMessage);
                });
            }).then(() => {
                logMessage = `${userId} has rejoined ${gameInfo.name}`;
                this.emitResponse('joined-game', gameInfo, logMessage);
            }).catch((error) => {
                logMessage = `Error retrieving game info: ${error.message}`;
                this.emitResponse(error.type, error.message, logMessage);
            });
        });
        // Gets list of all games a user is not in
        this.socket.on('get-game-list', (userId) => {
            let logMessage = '';
            this.fbServices.getGameList(userId, false).then((results) => {
                logMessage = 'Game list retrieved';
                this.emitResponse('game-list-retrieved', results, logMessage);
            }).catch((error) => {
                logMessage = `Error retrieving game list: ${error.message}`;
                this.emitResponse(error.type, error.message, logMessage);
            });
        });
        // Gets list of planet card/board sets
        this.socket.on('get-set-list', () => {
            let logMessage = '';
            this.fbServices.getSetList().then((results) => {
                logMessage = 'Set list retrieved';
                this.emitResponse('set-list-retrieved', results, logMessage);
            }).catch((error) => {
                logMessage = `Error retrieving set list: ${error.message}`;
                this.emitResponse(error.type, error.message, logMessage);
            });
        });
        // Removes user from game, then notifies all players in game that the user resigned
        this.socket.on('resign-game', (userId, gameId) => {
            let logMessage = '';
            this.fbServices.resignGame(userId, gameId).then((results) => {
                let updateData = {
                    userId: userId,
                    gameId,
                    name: results.name
                };
                logMessage = userId + ' resigned ' + results.name;
                this.emitResponse('resigned-game', results, logMessage);
                logMessage = 'Message broadcasted to other players';
                this.emitResponse('other-resigned-game', updateData, logMessage);
            }).catch((error) => {
                logMessage = `Error resigning game: ${error.message}`;
                this.emitResponse(error.type, error.message, logMessage);
            });
        });

        // game listeners
        this.socket.on('start-game', (gameId) => {
            this.startGame(gameId);
        });

        console.log('listeners setup');
    }

    /*************
     * emitResponse
     * Send response to client and log message on server
     *
     * @param type: string (type of message ID)
     * @param message: string (in-game message or game data)
     * @param logMessage: string (server message - if none sent, uses 'message')
     */
    emitResponse(type, message, logMessage) {
        console.log(new Date() + ': ' + (logMessage || message));
        this.socket.emit(type, message);
    }

    startGame(gameId) {
        let logMessage = '';

        this.fbServices.getCardData().then((cardData) => {
            logMessage = 'retrieved card data';
            this.emitResponse('card-data', cardData, logMessage);
        }).catch((error) => {
            logMessage = `Error retrieving card info while trying to start game: ${error.message}`;
            this.emitResponse(error.type, error.message, logMessage);
        });

        this.fbServices.getGameInfo(gameId).then((gameData) => {
            this.fbServices.updateGame(gameId, {isRunning: true}).catch((error) => {
                logMessage = `Error updating game info while trying to start game: ${error.message}`;
                this.emitResponse(error.type, error.message, logMessage);
            });
            return gameData;
        }).then((gameData) => {
            this.gameSetup(gameId, gameData);
            this.startTurnController(gameId, gameData);
            logMessage = `${gameId} is starting`;
            this.emitResponse('game-starting', null, logMessage);
        }).catch((error) => {
            logMessage = `Error retrieving game info while trying to start game: ${error.message}`;
            this.emitResponse(error.type, error.message, logMessage);
        });
    }

    gameSetup(gameId, gameInfo) {
        let playersIdList = gameInfo.playerIds;
        let startingInfluenceTokens = 3;
        let regions = gameInfo.set.regions;

        for (let playerId in playersIdList) {
            if (playersIdList.hasOwnProperty(playerId)) {
                this.giveInfluenceTokens(gameId, playerId, startingInfluenceTokens);
            }
        }

        for (let region in regions) {
            if (regions.hasOwnProperty(region)) {
                this.dealRegionCards(gameInfo, region);
            }
        }
    }

    dealRegionCards(gameInfo, region) {
        
    }

    startTurnController(gameId, gameInfo) {
        let playersIdList = gameInfo.playerIds;

        for (let turn = gameInfo.currentTurn; turn <= NUM_GAME_TURNS; turn++) {
            gameInfo.currentTurn++;
            this.increaseTurnNumber(gameId, gameInfo, playersIdList);
            playersIdList.forEach((playerId) => {
                this.playExpansionPhase(gameId, playerId);
                this.playDrawPhase();
                this.playInfluencePhase();
                this.playRecoverPhase();
            });
            this.waitForAllPlayersToPlay();
        }
        this.reportScore();
    }

    increaseTurnNumber(gameId, gameInfo, playersIdList) {
        let message = '';

        // This really needs to be written out as a promise chain to avoid continuing to update if error occurs
        playersIdList.forEach((playerId) => {
            this.fbServices.updateGame(gameId, gameInfo, playerId).then(() => {
                // go to next Id
            }).catch((error) => {
                message = `Error updating game turn value: ${error.message}`;
                this.emitResponse(error.type, error.message, message);
            });
            message = `Turn ${gameInfo.currentTurn} is starting`;
            this.emitResponse('game-message', message);
        });
    }

    giveInfluenceTokens(gameId, playerId, influenceTokens) {
        let gameData = {influenceTokens};
        let message = '';

        this.fbServices.updateGame(gameId, gameData, playerId).then(() => {
            message = `${playerId} has received ${influenceTokens} Influence Tokens`;
            this.emitResponse('game-message', message);
        }).catch((error) => {
            message = `Error updating game info while trying to give out tokens: ${error.message}`;
            this.emitResponse(error.type, error.message, message);
        });
    }

    playExpansionPhase(gameId, playerId) {
        this.giveInfluenceTokens(gameId, playerId, 1);
    }

    playDrawPhase() {

    }

    playInfluencePhase() {

    }

    playRecoverPhase() {

    }

    waitForAllPlayersToPlay() {

    }

    reportScore() {
        let message = `Game is over`;
        this.emitResponse('game-message', message);
    }
}

export { GameServer };
