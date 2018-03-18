var Message = require("./models/message");
var GameModel = require("./models/game");
var Game = require("./models/classes/game");
var Ship = require("./models/classes/ship");
var User = require("./models/user");

module.exports = function (io, jwt) {
    io.use(function (socket, next) {
        //provjeri: sto se dogodi ako nema tokena, npr ako se user nije uspjesno ulogiro
        if (socket.handshake.query && socket.handshake.query.token) {
            jwt.verify(socket.handshake.query.token, "najvecatajnanasvijetu", function (err, decoded) {
                if (err) {
                    console.log(err);
                    var err = new Error('Authentication error');
                    err.data = { type: 'authentication_error' };
                    return next(err);
                }
                socket.decoded = decoded;
                next();
            });
        }

        next(new Error('Authentication error'));
    });

    var users = [];
    var games = [];
    io.on('connection', function (socket) {
        console.log('a user connected');
        var user = {
            socketID: socket.id,
            userData: socket.decoded,
            status: "In lobby"
        };
        users.push(user);
        io.sockets.emit('usersChanged', users);

        socket.on('disconnect', function () {
            console.log('user disconnected');
            var index = users.findIndex(function (u) {
                return u.socketID == socket.id;
            })
            if (index !== -1) users.splice(index, 1);
            socket.broadcast.emit('usersChanged', users);
        });

        //SEND CHAT MESSAGES TO THE CLIENT
        Message.find({}, function (err, messages) {
            if (err) {
                //var err = new Error("Internal server error");
                err.status = 500;
                return next(err);
            }

            socket.emit("chat messages", messages);
        });

        socket.on('get users', function () {
            socket.emit("users", users);
        });

        //CHAT MESSAGES
        socket.on('chat message', function (message) {
            socket.broadcast.emit('chat message', message);
            //Save message to database
            Message.create(message, function (err, msg) {
                if (err) {
                    //var err = new Error("Internal server error");
                    
                    err.status = 500;
                    return next(err);
                }
            });
        });

        //LEADERBOARD
        socket.on('get leaderboard players', function () {
            User.find({}, "username gamesWon gamesLost").sort({ gamesWon: -1 }).exec(function (err, docs) {
                if (err) console.log(err);
                //send docs to client...
                socket.emit('leaderboard players', docs);
            });
        });

        //PLAYER GAMES (won and lost)
        socket.on('get player games', function (userID) {
            var userWonGames = [];
            var userLostGames = [];
            GameModel.find({ winnerID: userID }, 'players winnerHits loserHits forfeit timeFinished', function (err, docs) {
                if (err) console.log(err);
                docs.forEach((game) => {
                    var g = {
                        players: game.players,
                        hits: game.winnerHits + ":" + game.loserHits,
                        forfeit: game.forfeit,
                        time: game.timeFinished
                    };
                    userWonGames.push(g);
                });

                GameModel.find({ loserID: userID }, 'players winnerHits loserHits forfeit timeFinished', function (err, docs) {
                    if (err) console.log(err);
                    docs.forEach((game) => {
                        var g = {
                            players: game.players,
                            hits: game.winnerHits + ":" + game.loserHits,
                            forfeit: game.forfeit,
                            time: game.timeFinished
                        };
                        userLostGames.push(g);
                    });
                    socket.emit("player games", { userWonGames: userWonGames, userLostGames: userLostGames });
                });
            });
        });

        //CHALLENGE
        socket.on('challenge', function (userWhoChalleneged, challengedUser) {
            socket.to(challengedUser.socketID).emit('you are challenged', users.find(u => u.userData.id === userWhoChalleneged.id));
        });

        //ACCEPT CHALLENGE
        socket.on('accept', function (userWhoChalleneged) {
            var player1 = findUser(socket.id);
            player1.status = "In game";

            var player2 = findUser(userWhoChalleneged.socketID);
            player2.status = "In game";

            io.sockets.emit('usersChanged', users);

            var gameID = player1.userData.id + '_' + player2.userData.id;

            io.sockets.connected[userWhoChalleneged.socketID].join(gameID);
            socket.join(gameID);

            io.sockets.in(gameID).emit('game prestart', gameID, player1, player2);

            var game = new Game(gameID, player1, player2);
            games.push(game);
        });

        //DECLINE CHALLENGE
        socket.on('decline', function (userWhoChalleneged) {
            socket.to(userWhoChalleneged.socketID).emit('declined your challenge', findUser(socket.id).userData.username);
        });

        //SET PLAYER SHIPS (when users click Ready)
        socket.on("ships", function (gameID, ships) {
            var game = findGame(gameID);

            if (game != null && game != undefined) {
                if (game.player1Ships == null) {
                    game.player1Ships = makeShips(ships);
                }
                else if (game.player1Ships != null && game.player2Ships == null) {
                    game.player2Ships = makeShips(ships);
                    io.sockets.in(gameID).emit('game start', game.whooseTurnItIs().userData.id);
                }
                else {

                }
            }
            else {
                //console.log("but whyyyyyy")
            }
        });

        //SHOOT
        socket.on("shoot", function (gameID, point) {
            var game = findGame(gameID);
            if (game.whooseTurnItIs().userData.id == socket.decoded.id) {

                var shootResult = game.checkShoot(point);
                io.sockets.in(gameID).emit('shoot result', shootResult, game.whooseTurnItIs().userData.id, point);

                if (game.isWin()) {
                    socket.emit("game end you win", "");
                    socket.to(game.loser.socketID).emit("game end you lose", "");

                    //leavaj ih iz rooma
                    socket.leave(gameID);
                    io.sockets.connected[game.loser.socketID].leave(gameID);

                    game.winner.status = "In lobby";
                    game.loser.status = "In lobby";
                    io.sockets.emit('usersChanged', users);

                    User.findByIdAndUpdate(game.loser.userData.id, { $inc: { gamesLost: 1 } }, function (err, data) {
                        if (err) console.log(err);

                        User.findByIdAndUpdate(game.winner.userData.id, { $inc: { gamesWon: 1 } }, function (err, data) {
                            if (err) console.log(err);
                        });

                        User.find({}, "username gamesWon gamesLost").sort({ gamesWon: -1 }).exec(function (err, docs) {
                            if (err) console.log(err);
                            socket.broadcast.emit('leaderboard players', docs);
                        });
                    });

                    var gameToSave = game.gameSummary();
                    GameModel.create(gameToSave, function (err, data) {
                        if (err) {
                            console.log(err);
                        }
                    });

                    removeGame(gameID);
                }
                game.toggleTurn();
            }
            else {
                console.log("it's not your turn");
            }
        });

        //FORFEIT GAME
        socket.on('forfeit', function (gameID, user) {
            var game = findGame(gameID);
            if (game.player1.userData.id == user.id) {
                game.winner = game.player2;
                game.loser = game.player1;
            }
            else {
                game.winner = game.player1;
                game.loser = game.player2;
            }

            game.forfeit = true;

            socket.to(game.winner.socketID).emit('other player forfeited', user.username);

            socket.leave(gameID);
            io.sockets.connected[game.winner.socketID].leave(gameID);

            game.winner.status = "In lobby";
            game.loser.status = "In lobby";
            io.sockets.emit('usersChanged', users);

            User.findByIdAndUpdate(game.loser.userData.id, { $inc: { gamesLost: 1 } }, function (err, data) {
                if (err) console.log(err);

                User.findByIdAndUpdate(game.winner.userData.id, { $inc: { gamesWon: 1 } }, function (err, data) {
                    if (err) console.log(err);
                });

                User.find({}, "username gamesWon gamesLost").sort({ gamesWon: -1 }).exec(function (err, docs) {
                    if (err) console.log(err);
                    socket.broadcast.emit('leaderboard players', docs);
                });
            });

            var gameToSave = game.gameSummary();
            GameModel.create(gameToSave, function (err, data) {
                if (err) {
                    console.log(err);
                }
            });

            removeGame(gameID);
        });

    });

    function removeGame(gameID) {
        var index = games.findIndex(function (g) {
            return g.gameID == gameID;
        })
        if (index !== -1) games.splice(index, 1);
    }

    function makeShips(ships) {
        var newShips = [];
        ships.forEach(s => {
            var ship = new Ship(s.name, s.coordinates);
            ship.length = ship.coordinates.length;
            newShips.push(ship);
        });
        return newShips;
    }

    function findUser(socketID) {
        return users.find(u => u.socketID === socketID);
    }

    function findGame(gameRoomID) {
        return games.find(g => g.gameID === gameRoomID);
    }
}