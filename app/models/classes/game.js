//Player enum
Player = Object.freeze({ "player1": 1, "player2": 2 });

//Game class representing the actual game
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

    //return game summary which will be stored in the database
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

    //check if given ships are sunk
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

    //check is the win condition fulfiled
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

    //check shoot to see if it is a hit or miss
    checkShoot(point) {
        if (this.turn == Player.player1) {
            return this.isHit(point, this.player2Ships);
        }
        else {
            return this.isHit(point, this.player1Ships);
        }
    }

    //get whoose turn it is
    whooseTurnItIs() {
        if (this.turn == Player.player1)
            return this.player1;
        else
            return this.player2;
    }

    //change turn
    toggleTurn() {
        if (this.turn == Player.player1)
            this.turn = Player.player2;
        else
            this.turn = Player.player1;
    }

    //check if any of the given ships are hit and return an object containg information:
    //isHit - true if ship is hit, false if not
    //isSunk - if false, the ship is hit but not sunk, if true the ship is sunk (all parts of the ship are hit)
    isHit(point, ships) {
        var i, j;
        for (i = 0; i < ships.length; i++) {
            for (j = 0; j < ships[i].coordinates.length; j++) {
                var c = ships[i].coordinates[j];
                if (c.loc.x == point.x && c.loc.y == point.y) {
                    if (c.hit == false) {
                        c.hit = true;
                        ships[i].makeAHit();
                        this.whooseTurnItIs() == this.player1 ? this.player1Hits++ : this.player2Hits++;
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