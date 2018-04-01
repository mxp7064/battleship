app.controller('lobbyController', function ($scope, $http, Auth, $location, $window) {

    $scope.messages = [];
    $scope.socket;
    $scope.users = [];
    $scope.playersOnline = 0;
    $scope.loggedInUser;
    $scope.userWhoChalleneged;
    $scope.userWhoDeclined;
    $scope.loaderSnackFlag = false;
    $scope.leaderBoardPlayers;
    $scope.showPlayerGamesFlag = false;
    $scope.playerGamesUsername;
    $scope.loaderScoresFlag = false;

    //initialize functions - set up socket and loggedin user from authentication service
    $scope.init = function () {
        $scope.loggedInUser = Auth.getUser();

        if (Auth.getSocket() == null)
            Auth.setSocket();
        $scope.socket = Auth.getSocket();

        $scope.socket.on('connect', function () {

        }).on('disconnect', function () {

        });

        //get online users request
        $scope.socket.emit("get users", "");

        //handle get online users server response
        $scope.socket.on('users', function (users) {
            $scope.$apply(function () {
                $scope.users = users;
                $scope.playersOnline = $scope.users.length;
            });
        });

        //handle server push notification - add user
        $scope.socket.on('userAdded', function (user) {
            $scope.$apply(function () {
                $scope.users.push(user);
                $scope.playersOnline = $scope.users.length;
            });
        });

        //handle server push notification - user removed
        $scope.socket.on('userRemoved', function (socketID) {
            $scope.$apply(function () {
                var index = $scope.users.findIndex(function (u) {
                    return u.socketID == socketID;
                })
                if (index !== -1) $scope.users.splice(index, 1);

                $scope.playersOnline = $scope.users.length;
            });
        });

        //handle server push notification - users status changed
        $scope.socket.on('usersStatusChanged', function (users) {
            $scope.$apply(function () {
                for (var i = 0; i < users.length; i++) {
                    $scope.users[i].status = users[i].status;
                }
            });
        });

        //request leadrboard players from the server
        $scope.socket.emit("get leaderboard players", "");

        //get leaderboard players
        $scope.socket.on('leaderboard players', function (docs) {
            $scope.$apply(function () {
                $scope.leaderBoardPlayers = docs;
            });
        });

        //get player won and lost games
        $scope.socket.on('player games', function (userGames) {
            $scope.$apply(function () {
                $scope.userWonGames = userGames.userWonGames;
                $scope.userLostGames = userGames.userLostGames;
                $scope.showPlayerGamesFlag = true;
                $scope.loaderScoresFlag = false;
            });
        });

        //request previous chat messags from the server
        $scope.socket.emit("get chat messages", "");

        //receive prevopis chat messages
        $scope.socket.on('chat messages', function (messages) {
            $scope.$apply(function () {
                $scope.messages = messages;
            });

            $scope.scrollDown();
        });

        //receive chat message
        $scope.socket.on('chat message', function (message) {
            $scope.$apply(function () {
                $scope.messages.push(message);
                $scope.scrollDown();
            });
        });

        //when this player has been challenged
        $scope.socket.on('you are challenged', function (user) {
            showSnackBar("snackbarChallenge");

            $scope.$apply(function () {
                $scope.userWhoChallenged = user;
            });
        });

        //handle challenge timeout
        $scope.socket.on('challenge timeout', function () {
            $scope.$apply(function () {
                $(".challengeButton").css("display", "block");
                $(".challengeButton").css("pointer-events", "auto");
                $(".loader").css("display", "none");

                showSnackBar("snackbarChallengeTimeout");
                setTimeout(() => {
                    removeSnackBar("snackbarChallengeTimeout");
                }, 3000);
            });
        });

        //challenged timeout
        $scope.socket.on('challenged timeout', function () {
            removeSnackBar("snackbarChallenge");
        });

        //before the game starts set enemy player and save gameid in the auth service
        $scope.socket.on('game prestart', function (gameID, player1, player2) {
            var enemyPlayer = player1.userData.id == Auth.getUser().id ? player2.userData.username : player1.userData.username;
            Auth.setEnemyPlayer(enemyPlayer);
            Auth.setGameID(gameID);
            $scope.$apply(function () {
                $location.path("/game");
            });
        });

        //handle - player declined your challenge
        $scope.socket.on('declined your challenge', function (userWhoDeclined) {
            $scope.$apply(function () {
                $(".challengeButton").css("display", "block");
                $(".challengeButton").css("pointer-events", "auto");
                $(".loader").css("display", "none");

                $scope.userWhoDeclined = userWhoDeclined;
                showSnackBar("snackbarDeclined");
                setTimeout(() => {
                    removeSnackBar("snackbarDeclined");
                }, 3000);
            });
        });

        //when server emits an error to the client
        $scope.socket.on("error", function (err) {
            if (err.type == "internal_error") { alert("Something went wrong"); }

            if (err.type == 'authentication_error') {
                alert("You need to authenticate!");
                localStorage.removeItem('token');
                Auth.setUser(null);
                $window.location.reload();
            }
        });
    };

    $scope.init();

    //get player's games
    $scope.getPlayerGames = function (userID, username) {
        $scope.playerGamesUsername = username;
        $scope.socket.emit('get player games', userID);
        $scope.loaderScoresFlag = true;
    }

    //go back to leaderboard
    $scope.goBackToLeaderboard = function () {
        $scope.showPlayerGamesFlag = false;
    }

    //send chat message
    $scope.sendMessage = function () {
        if ($scope.messageToSend != "" && $scope.messageToSend != undefined) {
            var message = {
                userID: Auth.getUser().id,
                username: Auth.getUser().username,
                time: new Date(),
                msg: $scope.messageToSend
            };
            $scope.socket.emit('chat message', message);
            $scope.messages.push(message);
            $scope.scrollDown();
            $scope.messageToSend = "";
        }
    }

    //chalange a player
    $scope.challenge = function (user, $event) {
        $($event.currentTarget).css("display", "none");
        $(".challengeButton").css("pointer-events", "none");
        $(".loader-" + user.userData.id).css("display", "inline-block");
        $scope.socket.emit('challenge', Auth.getUser().id, user.userData.id);
    }

    $scope.isSameUser = function (user) {
        return user.userData.id == $scope.loggedInUser.id;
    }

    function showSnackBar(snack) {
        $("#" + snack).addClass("show");
    }

    function removeSnackBar(snack) {
        $("#" + snack).removeClass("show");
    }

    //accept challenge
    $scope.accept = function () {
        $scope.socket.emit('accept', $scope.userWhoChallenged);
        $scope.loaderSnackFlag = true;
    }

    //decline challenge
    $scope.decline = function () {
        $scope.socket.emit('decline', $scope.userWhoChallenged);
        removeSnackBar("snackbarChallenge");
    }

    //scroll down the chat messages
    $scope.scrollDown = function () {
        var height = 0;
        $('#messages li').each(function (i, value) {
            height += parseInt($(this).height());
        });
        height += '';
        $('#messages').animate({ scrollTop: height });
    }
});
