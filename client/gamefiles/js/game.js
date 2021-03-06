class Game {
    constructor(table, player, uiMessager, gameData) {
        this.table = table;
        this.player = player;
        this.uiMessager = uiMessager.bind(this);
        this.gameData = gameData;
        this.cards = {
            cardTypes: {},
            cardsByRegion: {}
        };
        this.gameRegions = [];

        this._initGameListeners();
        this.updateGame(this.gameData, 'load-game');
    }

    _initGameListeners() {
        let $startButton = $('#game-start-button');
        let playerIsCreator = this.gameData.creator === this.player.userId;
        let isRunning = this.gameData.isRunning;

        if (playerIsCreator && !isRunning) {
            $startButton.show().click(() => {
                this.table.startGame(this, this.uiMessager);
                $startButton.hide();
            });
        }
    }

    setupGame() {
        for (let world in this.table.gameBoards) {
            if (this.table.gameBoards.hasOwnProperty(world)) {
                this.gameRegions.push(world);
                this.placeWorld(world, this.table.gameBoards[world]);
            }
        }
    }

    clearGame() {
        $('#game-title').html('');
        $('#game-collected-influence').html('');
        $('#game-boards').html('');
        $('#players').html('');
    }

    placeWorld(worldName, worldInfo) {
        let $worldsContainer = $('#game-boards');
        let $newWorld = $(document.createElement('div'));

        $newWorld.text(worldName).addClass('world').attr('id', `world-${worldName.toLowerCase()}`);
        $worldsContainer.append($newWorld);
    }

    storeCards(cardData) {
        this.cards.cardTypes = cardData.cards;
        this.cards.cardsByRegion = cardData.regions;
    }

    updateGame(gameData, boardAction) {
        let $gameContent = $('#game-content');

        switch (boardAction) {
            case 'load-game' :
                this.clearGame();
                this.setupGame();
                let $players = $('#players');
                gameData.playerIds.forEach((name) => {
                    $players.append(`<span>${name} </span>`);
                });
                $gameContent.find('#game-title').text(`Game: ${gameData.name}`);
                break;
            case 'exit-game' : this.clearGame();
                break;
        }
    }

    updateOtherPlayer(userId, inGame) {

    }
}

export { Game };
