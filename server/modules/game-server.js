const HTTP_PORT = 4000;
const NUM_GAME_TURNS = 10;

class GameServer {
    constructor(fbServices, Express, http, SocketIO) {
        this.fbServices = fbServices;
        this.app = new Express;
        this.http = http.createServer(this.app);
        this.io = new SocketIO(this.http);
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
            logMessage = `Running setup...`;
            this.emitResponse('game-setup', null, logMessage);
            this.gameSetup(gameData);

            logMessage = `${gameId} is starting`;
            this.emitResponse('game-starting', null, logMessage);
            this.startTurnController(gameId, gameData);
        }).catch((error) => {
            logMessage = `Error retrieving game info while trying to start game: ${error.message}`;
            this.emitResponse(error.type, error.message, logMessage);
        });
    }

    /*******************
     * gameSetup
     *
     * @param gameInfo: object containing all game information (from /gameIDList/ in DB)
     */
    gameSetup(gameInfo) {
        let gameId = gameInfo.gameId;
        let playersIdList = gameInfo.playerIds;
        let startingInfluenceTokens = 3;
        let regions = gameInfo.set.regions;
        let colors = ['blue', 'green', 'red', 'yellow', 'white'];
        let i = 0;
        let playerId = '';

        for (let index in playersIdList) {
            if (playersIdList.hasOwnProperty(index)) {
                playerId = playersIdList[index];
                this.assignColor(gameId, playerId, colors[i]);
                this.giveInfluenceTokens(gameId, playerId, startingInfluenceTokens);
                i++;
            }
        }

        for (let region in regions) {
            if (regions.hasOwnProperty(region)) {
                this.dealRegionCards(gameInfo, region);
            }
        }
    }

    assignColor(gameId, playerId, color) {
        let gameData = {'colors': color};
        let message = '';

        this.fbServices.updateGame(gameId, gameData, playerId).then(() => {
            message = `${playerId} has been assigned the color ${color}`;
            this.emitResponse('game-message', message);
        }).catch((error) => {
            message = `Error updating game info while trying to give out tokens: ${error.message}`;
            this.emitResponse(error.type, error.message, message);
        });
    }

    dealRegionCards(gameInfo, region) {
        
    }

    startTurnController(gameId, gameInfo) {
        // this should be a list of listeners that make calls to the appropriate
        // fbservices functions to update the game, with a conditional that checks (before calling the fbservices
        // function) if some condition is met (usually all players having made their turn) - if so, then
        // the next phase's function is called (if needed to make any game updates based on everyone's turns)

        let playerOrder = Object.values(gameInfo.playerIds); // no specific ordering set
        let gameData = {currentPlayersTurn: playerOrder[0],
                        playerTurnOrder: playerOrder};
        this.fbServices.updateGame(gameId, gameData).catch((error) => {
            let logMessage = `Error updating game info while trying to start game: ${error.message}`;
            this.emitResponse(error.type, error.message, logMessage);
        });
        this.increaseTurnNumber(gameId, gameInfo.currentTurn++);
        this.playExpansionPhase(gameId, gameInfo);
    }

    increaseTurnNumber(gameId, currentTurn) {
        let gameData = {'currentTurn': currentTurn};
        let message = '';

        this.fbServices.updateGame(gameId, gameData).then(() => {
            message = `Turn ${currentTurn} is starting`;
            this.emitResponse('game-message', message);
        }).catch((error) => {
            message = `Error updating game turn value: ${error.message}`;
            this.emitResponse(error.type, error.message, message);
        });
    }

    playExpansionPhase(gameId, gameInfo) {
        let playersIdList = gameInfo.playerIds
        let message = '--Expansion phase--';
        this.emitResponse('game-message', message);

        for (let index in playersIdList) {
            if (playersIdList.hasOwnProperty(index)) {
                this.giveInfluenceTokens(gameId, playersIdList[index], 1);
            }
        }
        this.playDrawPhase(gameId, gameInfo);
    }

    playDrawPhase(gameId, gameInfo) {
        let message = '--Draw phase--';
        this.emitResponse('game-message', message);

        // loop through regions to draw cards for each

        this.playInfluencePhase(gameId, gameInfo);
    }

    async playInfluencePhase(gameId, gameInfo) {
        let allRegions = gameInfo.set.regions;
        let i = 0;
        let message = '--Influence phase--';
        this.emitResponse('game-message', message);

        for (let region in allRegions) {
            await this.getInfluenceBidsForRegion(allRegions[region], gameId, gameInfo).then((bids) => {
                // notify winner of bid and store win info
                let gameData = {winner: 'winningInfo'}; // placeholder key and values
                this.fbServices.updateGame(gameId, gameData).then(() => {
                    let winner = this.determineBidWinner(bids, gameData);
                    message = `${winner} won the bid for ${allRegions[i]}`;
                    this.emitResponse('game-message', message);
                }).catch((error) => {
                    message = `Error updating game turn value: ${error.message}`;
                    this.emitResponse(error.type, error.message, message);
                });
            });
        }

        this.socket.off('player-turn-done');
        this.playRecoverPhase(gameId, gameInfo);
    }

    determineBidWinner(bids, gameData) {
        let highest = gameData.influenceBids.polity || 0;
        let winner = 'polity' || null; // placeholder for polity
        let tie = true; // start at true with initial assumption all bids are 0
        for (let currentBid in bids) {
            if (bids[currentBid] > highest) {
                highest = bids[currentBid];
                winner = currentBid;
                tie = false;
            } else if (bids[currentBid] === bids[highest]) {
                tie = true;
            }
        }
        return winner;
    }

    getInfluenceBidsForRegion(region, gameId, gameInfo) {
        let bids = null;
        let message = `Bidding on ${region}. Place your influence bid.`;
        this.emitResponse('game-message', message);

        return new Promise((resolve) => {
            this.socket.on('player-turn-done', (userId, influenceBid) => {
                let gameData = {influenceBids: {userId: influenceBid}};
                bids[userId] = influenceBid;
                this.fbServices.updateGame(gameId, gameData).then(() => {
                    message = `You bid ${influenceBid} on ${region}. Waiting for all bidding to finish...`;
                    this.emitResponse('game-message', message);
                }).catch((error) => {
                    message = `Error updating bidding: ${error.message}`;
                    this.emitResponse(error.type, error.message, message);
                });

                if (bids.keys.length === gameInfo.playerCount) {
                    resolve(bids);
                }
            });
        });
    }

    playRecoverPhase(gameId, gameInfo) {
        let message = '--Recovery phase--';
        this.emitResponse('game-message', message);

        // ...

        this.checkForEndGame(gameId, gameInfo);
    }

    giveInfluenceTokens(gameId, playerId, influenceTokens) {
        let gameData = {influenceTokens};
        let message = '';

        this.fbServices.updateGame(gameId, gameData, playerId).then(() => {
            let plural = influenceTokens > 1 ? 's' : '';
            message = `${playerId} has received ${influenceTokens} Influence Token${plural}`;
            this.emitResponse('game-message', message);
        }).catch((error) => {
            message = `Error updating game info while trying to give out tokens: ${error.message}`;
            this.emitResponse(error.type, error.message, message);
        });
    }

    checkForEndGame(gameId, gameInfo) {
        if (gameInfo.isRunning) {
            this.increaseTurnNumber(gameId, gameInfo.currentTurn++);
            this.playExpansionPhase(gameId, gameInfo);
        } else {
            this.endGame(gameId, gameInfo);
        }
    }

    endGame(gameId, gameInfo) {
        let message = '';
        let gameData = {isRunning: false};

        // need code here to mark game as completed for each player, or however it should be stored

        this.fbServices.updateGame(gameId, gameData).then(() => {
            message = 'Game is over';
            this.emitResponse('game-message', message);
        }).catch((error) => {
            message = `Error updating game turn value: ${error.message}`;
            this.emitResponse(error.type, error.message, message);
        });
    }
}

export { GameServer };
