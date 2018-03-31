var Message = require("./models/message");
var GameModel = require("./models/game");
var Game = require("./models/classes/game");
var Ship = require("./models/classes/ship");
var User = require("./models/user");

module.exports = function (io, jwt) {
    //socketio middleware to check the existence and validity of jwt token on each socketio request
    io.use(function (socket, next) {
        if (socket.handshake.query && socket.handshake.query.token) {
            jwt.verify(socket.handshake.query.token, "najvecatajnanasvijetu", function (err, decoded) {
                if (err) {
                    var err = new Error('Authentication error');
                    err.data = { type: 'authentication_error' };
                    return next(err);
                }
                socket.decoded = decoded;
                next();
            });
        }
        else {
            var err = new Error('Authentication error');
            err.data = { type: 'authentication_error' };
            return next(err);
        }
    });

    //declare users and games arrays which will store users and games objects
    var users = [];
    var games = [];

    //handle socketio connection event
    io.on('connection', function (socket) {
        //when the user first connects put him in the users array and set status to In lobby
        var user = {
            socketID: socket.id,
            userData: socket.decoded,
            status: "In lobby"
        };
        users.push(user);

        //notify all socket clients that a new user has connected
        io.sockets.emit('userAdded', user);

        //when user disconnects remove him from the users array and notify all clients
        socket.on('disconnect', function () {
            var index = users.findIndex(function (u) {
                return u.socketID == socket.id;
            })
            if (index !== -1) users.splice(index, 1);
            socket.broadcast.emit('userRemoved', socket.id);
        });

        //send stored chat messages to the client when the client connects in the lobby so the user can see old chat messages
        Message.find({}, function (err, messages) {
            if (err) {
                var err = new Error('Internal server error');
                err.type = 'internal_error';
                io.emit('error', err);
            }

            socket.emit("chat messages", messages);
        });

        //send list of users to the client
        socket.on('get users', function () {
            socket.emit("users", users);
        });

        //CHAT MESSAGES
        socket.on('chat message', function (message) {
            //Save message to database and send it to all other clients
            Message.create(message, function (err, msg) {
                if (err) {
                    var err = new Error('Internal server error');
                    err.type = 'internal_error';
                    io.emit('error', err);
                }
                socket.broadcast.emit('chat message', message);
            });
        });

        //send a list of leaderboard players sorted based on games won
        socket.on('get leaderboard players', function () {
            User.find({}, "username gamesWon gamesLost").sort({ gamesWon: -1 }).exec(function (err, docs) {
                if (err) {
                    var err = new Error('Internal server error');
                    err.type = 'internal_error';
                    io.emit('error', err);
                }
                //send docs to client
                socket.emit('leaderboard players', docs);
            });
        });

        //get a particular player's list of games (won and lost)
        socket.on('get player games', function (userID) {
            var userWonGames = [];
            var userLostGames = [];
            //get games that the given user won
            GameModel.find({ winnerID: userID }, 'players winnerHits loserHits forfeit timeFinished', function (err, docs) {
                if (err) {
                    var err = new Error('Internal server error');
                    err.type = 'internal_error';
                    io.emit('error', err);
                }
                docs.forEach((game) => {
                    var g = {
                        players: game.players,
                        hits: game.winnerHits + ":" + game.loserHits,
                        forfeit: game.forfeit,
                        time: game.timeFinished
                    };
                    userWonGames.push(g);
                });

                //get the games that the given user lost
                GameModel.find({ loserID: userID }, 'players winnerHits loserHits forfeit timeFinished', function (err, docs) {
                    if (err) {
                        var err = new Error('Internal server error');
                        err.type = 'internal_error';
                        io.emit('error', err);
                    }
                    docs.forEach((game) => {
                        var g = {
                            players: game.players,
                            hits: game.winnerHits + ":" + game.loserHits,
                            forfeit: game.forfeit,
                            time: game.timeFinished
                        };
                        userLostGames.push(g);
                    });
                    //send both won and lost games
                    socket.emit("player games", { userWonGames: userWonGames, userLostGames: userLostGames });
                });
            });
        });

        //when a player challges another player, change their status to Challenged, send challenged player "you are challenged" event
        //and setup timeout mechanism which will timeout the challenge after 10 seconds if the challenged player doesn't accept the challenge
        socket.on('challenge', function (userWhoChallenegedID, challengedUserID) {
            var userWhoChalleneged = users.find(u => u.userData.id === userWhoChallenegedID);
            var challengedUser = users.find(u => u.userData.id === challengedUserID);

            userWhoChalleneged.status = "Challenged";
            challengedUser.status = "Challenged";

            io.sockets.emit('usersStatusChanged', users);

            socket.to(challengedUser.socketID).emit('you are challenged', userWhoChalleneged);
            setTimeout(function () {
                socket.emit("challenge timeout");
                socket.to(challengedUser.socketID).emit("challenged timeout");
                if (userWhoChalleneged.status != "In game") {
                    userWhoChalleneged.status = "In lobby";
                    challengedUser.status = "In lobby";
                    io.sockets.emit('usersStatusChanged', users);
                }
            }, 10000);
        });

        //when the user accepts the challenge, change their status to In game, create a game room and join
        //both of them and also create the game object and add it to the games array
        socket.on('accept', function (userWhoChalleneged) {
            var player1 = findUser(socket.id);
            player1.status = "In game";

            var player2 = findUser(userWhoChalleneged.socketID);
            player2.status = "In game";

            io.sockets.emit('usersStatusChanged', users);//change status

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

        //SET PLAYER SHIPS (when users clicks Ready)
        socket.on("ships", function (gameID, ships, userID) {
            var game = findGame(gameID);

            if (game != null && game != undefined) {
                if (game.player1.userData.id == userID && game.player1Ships == null) {
                    game.player1Ships = makeShips(ships);
                }
                if (game.player2.userData.id == userID && game.player2Ships == null) {
                    game.player2Ships = makeShips(ships);
                }
                if (game.player1Ships != null && game.player2Ships != null) {
                    io.sockets.in(gameID).emit('game start', game.whooseTurnItIs().userData.id);
                }
            }
        });

        //SHOOT MECHANISM
        socket.on("shoot", function (gameID, point) {
            var game = findGame(gameID);
            //check if it's the right turn
            if (game.whooseTurnItIs().userData.id == socket.decoded.id) {

                //check shoot result (hit or miss)
                var shootResult = game.checkShoot(point);
                io.sockets.in(gameID).emit('shoot result', shootResult, game.whooseTurnItIs().userData.id, point);

                //if the win condition is fulfiled...
                if (game.isWin()) {
                    //send appropriate events to each player in the game
                    socket.emit("game end you win", "");
                    socket.to(game.loser.socketID).emit("game end you lose", "");

                    //destory the game room
                    socket.leave(gameID);
                    io.sockets.connected[game.loser.socketID].leave(gameID);

                    //change players status back to In lobby and notify others about that change
                    game.winner.status = "In lobby";
                    game.loser.status = "In lobby";
                    io.sockets.emit('usersStatusChanged', users);//change status

                    //update games lost and games won for the loser and winner of the game
                    User.findByIdAndUpdate(game.loser.userData.id, { $inc: { gamesLost: 1 } }, function (err, data) {
                        if (err) {
                            var err = new Error('Internal server error');
                            err.type = 'internal_error';
                            io.emit('error', err);
                        }

                        User.findByIdAndUpdate(game.winner.userData.id, { $inc: { gamesWon: 1 } }, function (err, data) {
                            if (err) {
                                var err = new Error('Internal server error');
                                err.type = 'internal_error';
                                io.emit('error', err);
                            }
                        });

                        //after update again send the leaderboard to the clients so they can update it
                        User.find({}, "username gamesWon gamesLost").sort({ gamesWon: -1 }).exec(function (err, docs) {
                            if (err) {
                                var err = new Error('Internal server error');
                                err.type = 'internal_error';
                                io.emit('error', err);
                            }
                            socket.broadcast.emit('leaderboard players', docs);
                        });
                    });

                    //save the game to the database
                    var gameToSave = game.gameSummary();
                    GameModel.create(gameToSave, function (err, data) {
                        if (err) {
                            var err = new Error('Internal server error');
                            err.type = 'internal_error';
                            io.emit('error', err);
                        }
                    });
                    //remove the game from the games array
                    removeGame(gameID);
                }
                //change turn
                game.toggleTurn();
            }
        });

        //FORFEIT GAME
        socket.on('forfeit', function (gameID, user) {
            //player who forfeited is the loser and the other one is the winner
            var game = findGame(gameID);
            if (game.player1.userData.id == user.id) {
                game.winner = game.player2;
                game.loser = game.player1;
            }
            else {
                game.winner = game.player1;
                game.loser = game.player2;
            }

            //set game forfeit to true
            game.forfeit = true;

            //notify the other player
            socket.to(game.winner.socketID).emit('other player forfeited', user.username);

            //destory the game room
            socket.leave(gameID);
            io.sockets.connected[game.winner.socketID].leave(gameID);

            //change players status back to In lobby and notify others about that change
            game.winner.status = "In lobby";
            game.loser.status = "In lobby";
            io.sockets.emit('usersStatusChanged', users);//change status

            //update games lost and games won for the loser and winner of the game
            User.findByIdAndUpdate(game.loser.userData.id, { $inc: { gamesLost: 1 } }, function (err, data) {
                if (err) {
                    var err = new Error('Internal server error');
                    err.type = 'internal_error';
                    io.emit('error', err);
                }

                User.findByIdAndUpdate(game.winner.userData.id, { $inc: { gamesWon: 1 } }, function (err, data) {
                    if (err) {
                        var err = new Error('Internal server error');
                        err.type = 'internal_error';
                        io.emit('error', err);
                    }
                });

                //after update again send the leaderboard to the clients so they can update it
                User.find({}, "username gamesWon gamesLost").sort({ gamesWon: -1 }).exec(function (err, docs) {
                    if (err) {
                        var err = new Error('Internal server error');
                        err.type = 'internal_error';
                        io.emit('error', err);
                    }
                    socket.broadcast.emit('leaderboard players', docs);
                });
            });

            //save the game to the database
            var gameToSave = game.gameSummary();
            GameModel.create(gameToSave, function (err, data) {
                if (err) {
                    var err = new Error('Internal server error');
                    err.type = 'internal_error';
                    io.emit('error', err);
                }
            });

            removeGame(gameID);
        });

    });

    //remove game from games array
    function removeGame(gameID) {
        var index = games.findIndex(function (g) {
            return g.gameID == gameID;
        })
        if (index !== -1) games.splice(index, 1);
    }

    //construct ship objects
    function makeShips(ships) {
        var newShips = [];
        ships.forEach(s => {
            var ship = new Ship(s.name, s.coordinates);
            ship.length = ship.coordinates.length;
            newShips.push(ship);
        });
        return newShips;
    }

    //find user in the users array
    function findUser(socketID) {
        return users.find(u => u.socketID === socketID);
    }

    //find game in the games array
    function findGame(gameRoomID) {
        return games.find(g => g.gameID === gameRoomID);
    }
}