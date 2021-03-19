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

        this._initGameListeners();
    }

    updateBoard(boardAction, gameData) {
        let $gameContent = $('#game-content');

        switch (boardAction) {
            case 'load-game':
            case 'join-game':
            case 'create-game':
                this._clearBoard();
                this._setupBoard();
                let $players = $('#players');
                gameData.playerIds.forEach((name) => {
                    $players.append(`<span>${name} </span>`);
                });
                $gameContent.find('#game-title').text(`Game: ${gameData.name}`);
                break;
            case 'store-cards' : this._storeCards(gameData);
                break;
            case 'resign-game' : this._clearBoard();
                break;
        }
    }

    updateOtherPlayer(userId, inGame) {

    }

    _initGameListeners() {
        let $startButton = $('#game-start-button');
        let playerIsCreator = this.gameData.creator === this.player.userId;
        let isRunning = this.gameData.isRunning;

        if (playerIsCreator && !isRunning) {
            $startButton.show().click(() => {
                this.table.startGame(this, this.uiMessenger);
                $startButton.hide();
                $startButton.off('click');
            });
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
        $('#game-boards').html('');
        $('#players').html('');
        this.gameData = {};
        this.cards = {
            cardTypes: {},
            cardsByRegion: {}
        };
        this.gameRegions = [];
    }

    _placeWorld(worldName, worldInfo) {
        let $worldsContainer = $('#game-boards');
        let $newWorld = $(document.createElement('div'));

        $newWorld.text(worldName).addClass('world').attr('id', `world-${worldName.toLowerCase()}`);
        $worldsContainer.append($newWorld);
    }

    _storeCards(cardData) {
        this.cards.cardTypes = cardData.cards;
        this.cards.cardsByRegion = cardData.regions;
    }
}

export { Game };
