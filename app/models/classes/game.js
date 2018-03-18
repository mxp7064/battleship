Player = Object.freeze({ "player1": 1, "player2": 2 });

class Game {
    constructor(gameID, player1, player2) {
        this.gameID = gameID;
        this.turn = Player.player1;
        this.player1 = player1;
        this.player2 = player2;
        this.player1Ships = null;
        this.player2Ships = null;
        this.player1Hits = 0;
        this.player2Hits = 0;
        this.winner = null;
        this.loser = null;
        this.forfeit = false;
    }

    gameSummary()
    {
        return {
            winnerID: this.winner.userData.id,
            loserID: this.loser.userData.id,
            players: this.winner.userData.username + " vs " + this.loser.userData.username,
            winnerHits: this.winner.userData.id == this.player1.userData.id ? this.player1Hits : this.player2Hits,
            loserHits: this.loser.userData.id == this.player1.userData.id ? this.player1Hits : this.player2Hits,
            forfeit: this.forfeit,
            timeFinished: new Date()
        };
    }

    checkAreAllSunk(ships)
    {
        var i;
        for (i = 0; i < ships.length; i++) {
            if(ships[i].isSunk == false)
            {
                return false;
            }
        }

        return true;
    }

    isWin(){
        if (this.turn == Player.player1) {
            if(this.checkAreAllSunk(this.player2Ships)){
                this.winner = this.player1;
                this.loser = this.player2;
                return true;
            }
        }
        else {
            if(this.checkAreAllSunk(this.player1Ships)){
                this.winner = this.player2;
                this.loser = this.player1;
                return true;
            }
        }

        return false;
    }

    

    checkShoot(point) {//point = { x: 3, y: 5}
        if (this.turn == Player.player1) {
            return this.isHit(point, this.player2Ships);
        }
        else {
            return this.isHit(point, this.player1Ships);
        }
    }

    whooseTurnItIs() {
        if (this.turn == Player.player1)
            return this.player1;
        else
            return this.player2;
    }

    toggleTurn() {
        if (this.turn == Player.player1)
            this.turn = Player.player2;
        else
            this.turn = Player.player1;
    }

    isHit(point, ships) {
        var i, j;
        for (i = 0; i < ships.length; i++) {
            for (j = 0; j < ships[i].coordinates.length; j++) {
                var c = ships[i].coordinates[j];
                if (c.loc.x == point.x && c.loc.y == point.y) {
                    if (c.hit == false) {
                        c.hit = true;
                        ships[i].makeAHit();
                        this.whooseTurnItIs() == this.player1 ? this.player1Hits++ : this.player2Hits;
                        if (ships[i].isSunk) {
                            return { isHit: true, isSunk: true, shipName: ships[i].name };
                        }
                        else {
                            return { isHit: true, isSunk: false };
                        }

                    }
                    else {
                        return { isHit: false };//already hit
                    }
                }
            }
        }
        return { isHit: false };
    }

}

module.exports = Game;
//{ loc: { x: null, y: null }, hit: false }
//var game = new Game(roomID, socketID, socketID, player1Ships, player2Ships);