const HTTP_PORT = 4000;
const NUM_GAME_TURNS = 10;

class GameServer {
    constructor(fbServices, Express, http, Server) {
        this.fbServices = fbServices;
        this.app = new Express;
        this.http = http.createServer(this.app);
        this.io = new Server(this.http, {
            cors: {
                origin: "http://localhost"
            }
        });
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
                    userId,
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

                this.fbServices.updateUser(userId, params).then(() => {
                    this.updateUserOnResume(userId, gameInfo);
                }).catch((error) => {
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
        let gameData = null;

        this.fbServices.getCardData().then((cardData) => {
            logMessage = 'retrieved card data';
            this.emitResponse('card-data', cardData, logMessage);
        }).then(() => {
            return this.fbServices.getGameInfo(gameId).then(data => {
                gameData = data;
            }).catch((error) => {
                logMessage = `Error retrieving game info while trying to start game: ${error.message}`;
                this.emitResponse(error.type, error.message, logMessage);
            });
        }).then(() => {
            return this.fbServices.updateGame(gameId, {isRunning: true, currentTurn: 1}).catch((error) => {
                logMessage = `Error updating game info while trying to start game: ${error.message}`;
                this.emitResponse(error.type, error.message, logMessage);
            });
        }).then(() => {
            logMessage = `Running setup...`;
            this.emitResponse('game-setup', null, logMessage);
            return this.gameSetup(gameData);
        }).then(() => {
            this.playGameLoop(gameId, gameData);
        }).catch((error) => {
            logMessage = `Error trying to start game: ${error.message}`;
            this.emitResponse(error.type, error.message, logMessage);
        });
    }

    playGameLoop(gameId, gameData) {
        this.startNextTurn(gameId, gameData).then(() => {
            return this.playExpansionPhase(gameId, gameData);
        }).then(() => {
            return this.playDrawPhase(gameId, gameData);
        }).then(() => {
            return this.playInfluencePhase(gameId, gameData);
        }).then(() => {
            return this.playRecoverPhase(gameId, gameData);
        }).then(() => {
            //for testing to prevent endless loop
            gameData.isRunning = false;

            if (gameData.isRunning) {
                this.playGameLoop(gameId, gameData);
            } else {
                return this.endGame(gameId);
            }
        }).catch(error => {
            const logMessage = `Error playing game loop: ${error.message}`;
            this.emitResponse(error.type, error.message, logMessage);
        });
    }

    /*******************
     * gameSetup assigns player colors and gives out starting inf tokens, then goes to deal cards
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
        let promises = [];
        let message = '';

        for (const playerId of Object.values(playersIdList)) {
            promises.push(this.assignColor(gameId, playerId, colors[i++]));
            promises.push(this.giveInfluenceTokens(gameId, playerId, startingInfluenceTokens));
        }
        for (const region in Object.values(regions)) {
            promises.push(this.dealRegionCards(gameInfo, region));
        }
        return Promise.all(promises).then(() => {
            message = `${gameId} is starting`;
            this.emitResponse('game-starting', null, message);
        }).catch(error => {
            message = `Error while setting up game: ${error}`;
            this.emitResponse('game-message', message);
        });
    }

    updateUserOnResume(userId, gameInfo) {

    }

    assignColor(gameId, playerId, color) {
        let gameData = {'colors': color};
        let message = '';

        return new Promise((resolve, reject) => {
            this.fbServices.updateGame(gameId, gameData, playerId).then(() => {
                message = `${playerId} has been assigned the color ${color}`;
                this.emitResponse('game-message', message);
                resolve();
            }).catch((error) => {
                message = `Error updating game info while trying to assign player colors: ${error.message}`;
                this.emitResponse(error.type, error.message, message);
                reject();
            });
        });
    }

    /****
     * Gives out inf tokens to a player
     * @param gameId: string (uuid)
     * @param playerId: string
     * @param influenceTokens: int (number of tokens to give each player)
     * @returns {Promise<unknown[]>}
     */
    giveInfluenceTokens(gameId, playerId, influenceTokens) {
        let message = '';

        return new Promise((resolve, reject) => {
            this.fbServices.getGameInfo(gameId).then((data) => {
                return data.influenceTokens ? data.influenceTokens[playerId] : 0;
            }).then((currentInfluenceTokens) => {
                const gameData = {influenceTokens: currentInfluenceTokens + influenceTokens};
                return this.fbServices.updateGame(gameId, gameData, playerId).then(() => {
                    const plural = influenceTokens > 1 ? 's' : '';
                    message = `${playerId} has received ${influenceTokens} Influence Token${plural}`;
                    this.emitResponse('game-message', message);
                    resolve();
                });
            }).catch((error) => {
                message = `Error updating game info while trying to give out tokens: ${error.message}`;
                this.emitResponse(error.type, error.message, message);
                reject();
            });
        });
    }

    dealRegionCards(gameInfo, region) {
        return new Promise((resolve, reject) => {
            resolve();
        });
    }

    startNextTurn(gameId, gameInfo) {
        // this should be a list of listeners that make calls to the appropriate
        // fbservices functions to update the game, with a conditional that checks (before calling the fbservices
        // function) if some condition is met (usually all players having made their turn) - if so, then
        // the next phase's function is called (if needed to make any game updates based on everyone's turns)

        let playerOrder = Object.values(gameInfo.playerIds); // no specific ordering set
        let gameData = {currentPlayersTurn: playerOrder[0],
                        playerTurnOrder: playerOrder};

        return new Promise((resolve, reject) => {
            this.fbServices.updateGame(gameId, gameData).then(() => {
                this.increaseTurnNumber(gameId, ++gameInfo.currentTurn).then(() => {
                    resolve();
                });
            }).catch((error) => {
                let logMessage = `Error updating game info while trying to start next turn: ${error.message}`;
                this.emitResponse(error.type, error.message, logMessage);
                reject();
            });
        });
    }

    increaseTurnNumber(gameId, currentTurn) {
        let gameData = {currentTurn};
        let message = '';

        return new Promise((resolve, reject) => {
            this.fbServices.updateGame(gameId, gameData).then(() => {
                message = `Turn ${currentTurn} is starting`;
                this.emitResponse('game-message', message);
                resolve();
            }).catch((error) => {
                message = `Error updating game turn value: ${error.message}`;
                this.emitResponse(error.type, error.message, message);
                reject();
            });
        });
    }

    /******
     * starts Expansion phase, in which influence tokens are given out
     *
     * @param gameId: string (uuid)
     * @param gameInfo
     */
    playExpansionPhase(gameId, gameInfo) {
        let playersIdList = gameInfo.playerIds;
        let promises = [];
        let message = '--Expansion phase--';
        this.emitResponse('game-message', message);

        for (const playerId of Object.values(playersIdList)) {
            promises.push(this.giveInfluenceTokens(gameId, playerId, 1));
        }
        return Promise.all(promises).catch(error => {
            message = `Error while giving out influence tokens: ${error}`;
            this.emitResponse('game-message', message);
        });
    }

    playDrawPhase(gameId, gameInfo) {
        let message = '--Draw phase--';
        this.emitResponse('game-message', message);

        // loop through regions to draw cards for each
        return new Promise((resolve, reject) => {
            resolve();
        });
    }

    playInfluencePhase(gameId, gameInfo) {
        const allRegions = gameInfo.set.regions;
        const message = '--Influence phase--';
        this.emitResponse('game-message', message);

        // think we need to loop through the regions and set up promises,
        // but wait for each promise to resolve before setting up the next one
        return this.getInfluenceBids(gameId, gameInfo, allRegions);
    }

    getInfluenceBids(gameId, gameInfo, allRegions) {
        let message = '';
        let promises = [];

        for (const region of Object.keys(allRegions)) {
            promises.push(
                this.getInfluenceBidsForRegion(region, gameId, gameInfo).then((bids) => {
                    // notify winner of bid and store win info
                    const gameData = {winner: 'winningInfo'}; // placeholder key and values
                    return this.fbServices.updateGame(gameId, gameData).then(() => {
                        const winner = this.determineBidWinner(bids, gameData);
                        message = `${winner} won the bid for ${region}`;
                        this.emitResponse('game-message', message);
                    }).catch((error) => {
                        message = `Error getting influence bids: ${error.message}`;
                        this.emitResponse(error.type, error.message, message);
                    });
                })
            );
        }
        return Promise.allSettled(promises).catch(error => {
            message = `Error while getting bids: ${error}`;
            this.emitResponse('game-message', message);
        });
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

    getInfluenceBidsForRegion(currentRegionName, gameId, gameInfo) {
        return new Promise((resolve, reject) => {
            let bids = null;
            let message = `Bidding on "${currentRegionName}". Place your influence bid.`;
            this.emitResponse('game-message', message);

            this.socket.on('place-bid', (userId, influenceBid) => {
                let gameData = {influenceBids: {userId: influenceBid}};
                bids[userId] = influenceBid;
                this.fbServices.updateGame(gameId, gameData).then(() => {
                    message = `You bid ${influenceBid} on ${currentRegionName}. Waiting for all bidding to finish...`;
                    this.emitResponse('game-message', message);
                }).catch((error) => {
                    message = `Error updating bidding: ${error.message}`;
                    this.emitResponse(error.type, error.message, message);
                    reject();
                });

                if (Object.keys(bids).length === gameInfo.playerCount) {
                    resolve(bids);
                }
            });
        });
    }

    playRecoverPhase(gameId, gameData) {
        let message = '--Recovery phase--';
        this.emitResponse('game-message', message);

        // ...

        return new Promise((resolve, reject) => {
            resolve();
        });
    }

    endGame(gameId) {
        let message = '';
        let gameData = {isRunning: false};

        // need code here to mark game as completed for each player, or however it should be stored

        return new Promise((resolve, reject) => {
            this.fbServices.updateGame(gameId, gameData).then(() => {
                message = 'Game is over';
                this.emitResponse('game-message', message);
                resolve();
            }).catch((error) => {
                message = `Error updating game turn value: ${error.message}`;
                this.emitResponse(error.type, error.message, message);
                reject();
            });
        });
    }
}

export { GameServer };
