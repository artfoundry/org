// Controls game board in DOM from time game loads until game unloads
class Game {
    constructor(table, player, uiMessenger, gameData) {
        this.table = table;
        this.player = player;
        this.uiMessenger = uiMessenger.bind(this);
        this.gameData = gameData;
        this.cards = {
            cardTypes: {},
            cardsByRegion: {}
        };
        this.gameRegions = [];

        // bindings
        this.table.startGame = this.table.startGame.bind(this.table);

        this._initGameListeners();
    }

    updateBoard(boardAction, gameData) {
        let $gameContent = $('#game-content');

        switch (boardAction) {
            // load, join, and create all do the same thing for updating the board (difference is for messaging in UI)
            case 'load-game':
            case 'join-game':
            case 'create-game':
                this._clearBoard();
                this._setupBoard();
                let $playerList = $('#game-players').html('');
                let name = '';
                for (let index in gameData.playerIds) {
                    if (gameData.playerIds.hasOwnProperty(index)) {
                        name = gameData.playerIds[index];
                        let $playerInfo = $(document.createElement('div'));
                        $playerInfo.addClass('game-playerlist-player');
                        $playerInfo.append(`<span>${name}</span>`);
                        if (gameData.isRunning) {
                            $playerInfo.append(`<span id="${name}" class="player-influence ${gameData.colors[name]}">${gameData.influenceTokens[name]}</span>`);
                        }
                        $playerList.append($playerInfo);
                    }
                }
                $gameContent.show().find('#game-title').text(`${gameData.name}`);
                break;
            case 'store-cards' : this._storeCardData(gameData);
                break;
            case 'update-game' : this._updateBoard(gameData);
                break;
            case 'resign-game' : this._clearBoard();
                break;
        }
        if (gameData.isRunning) {
            $('#world-boards-container').show();
        }
    }

    updateOtherPlayer(userId, inGame) {

    }

    _initGameListeners() {
        let $startButton = $('#game-start-button');
        let $waitingMessage = $('#waiting-to-start-message');
        let playerIsCreator = this.gameData.creator === this.player.userId;
        let isRunning = this.gameData.isRunning;
        let playerCount = this.gameData.playerCount;

        if (!isRunning) {
            if (playerIsCreator) {
                $startButton.show();
                $waitingMessage.hide();
                $startButton.click(() => {
                    if (playerCount > 1) {
                        this.table.startGame(this, this.uiMessenger);
                        $startButton.hide();
                        $startButton.off('click');
                    } else {
                        this.uiMessenger({messageType: 'game-message', messageDetails: 'Game must have at least 2 players to start.'})
                    }
                });
            } else {
                $startButton.hide();
                $waitingMessage.show();
            }
        }
    }

    _setupBoard() {
        for (let world in this.table.gameRegions) {
            if (this.table.gameRegions.hasOwnProperty(world)) {
                this.gameRegions.push(world);
                this._placeWorld(world, this.table.gameRegions[world]);
            }
        }
    }

    _clearBoard() {
        $('#game-title').html('');
        $('#game-collected-influence').html('');
        $('#world-boards-container').html('');
        $('#players').html('');
        $('#game-content').hide();
        this.gameData = {};
        this.cards = {
            cardTypes: {},
            cardsByRegion: {}
        };
        this.gameRegions = [];
    }

    _placeWorld(worldName, worldInfo) {
        let $worldsContainer = $('#world-boards-container');
        let $newWorldContainer = $(document.createElement('div'));
        let $newWorldName = $(document.createElement('div'));
        let $bidButton = $(document.createElement('button'));
        let $bidEntry = $(document.createElement('input'));
        let worldNameLowerCase = worldName.toLowerCase();
        let bid = 0;

        $worldsContainer.hide();
        $newWorldContainer.addClass('world').attr('id', `world-${worldNameLowerCase}`);
        $newWorldName.text(worldName).addClass('world-name');
        $bidEntry.attr('type', 'text').attr('size', '4').attr('id', `bid-world-${worldNameLowerCase}`).on('input', (event)=> {
            bid = event.target.value;
            if (bid.match(/\d*\D+/)) {
                $bidButton.addClass('disabled');
                this.uiMessenger({messageType: 'game-message', messageDetails: 'Bid must be a number of 1 or greater.'});
            } else if (bid.match(/\d+/)) {
                $bidButton.removeClass('disabled');
            } else if (bid.length === 0) {
                $bidButton.addClass('disabled');
            }
        });
        $bidButton.text('Place bid').addClass('button disabled').attr('tabindex', '0').click(()=> {
            this.table.placeBid(bid);
        });
        $newWorldContainer.append($newWorldName).append($bidEntry).append($bidButton);
        $worldsContainer.append($newWorldContainer);
    }

    _storeCardData(cardData) {
        this.cards.cardTypes = cardData.cards;
        this.cards.cardsByRegion = cardData.regions;
    }

    _updateBoard(updateData) {
        const updateType = updateData.updateType;
        switch (updateType) {
            case 'player-tokens' : $('.player-influence').each(function() {
                const playerName = $(this).attr('id');
                $(this).text(`${updateData.influenceTokens[playerName]}`);
            });
        }
    }
}

export { Game };
