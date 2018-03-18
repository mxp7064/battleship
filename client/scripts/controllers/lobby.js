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

    $scope.init = function () {
        $scope.loggedInUser = Auth.getUser();

        if(Auth.getSocket() == null)
            Auth.setSocket();
        $scope.socket = Auth.getSocket();

        $scope.socket.on('connect', function () {
            //console.log('authenticated');
        }).on('disconnect', function () {
            //console.log('disconnected');
        });

        //USERS
        $scope.socket.emit("get users", "");

        $scope.socket.on('users', function (users) {
            $scope.$apply(function () {
                $scope.users = users;
                $scope.playersOnline = $scope.users.length;
            });
        });

        $scope.socket.on('usersChanged', function (users) {
            $scope.$apply(function () {
                $scope.users = users;
                $scope.playersOnline = $scope.users.length;
            });
        });

        //LEADERBOARD
        $scope.socket.emit("get leaderboard players", "");

        $scope.socket.on('leaderboard players', function (docs) {
            console.log(docs);
            $scope.$apply(function () {
                $scope.leaderBoardPlayers = docs;
            });
        });

        //PLAYER GAMES (WON AND LOST)
        $scope.socket.on('player games', function (userGames) {
            console.log(userGames);
            $scope.$apply(function () {
                $scope.userWonGames = userGames.userWonGames;
                $scope.userLostGames = userGames.userLostGames;
                $scope.showPlayerGamesFlag = true;
                $scope.loaderScoresFlag = false;
            });
        });

        //GET CHAT MESSAGES
        $scope.socket.on('chat messages', function (messages) {
            $scope.$apply(function () {
                $scope.messages = messages;
            });
            
            $scope.scrollDown();
        });

        $scope.socket.on('chat message', function (message) {
            $scope.$apply(function () {
                $scope.messages.push(message);
                $scope.scrollDown();
            });
        });

        $scope.socket.on('you are challenged', function (user) {
            showSnackBar("snackbarChallenge");

            $scope.$apply(function () {
                $scope.userWhoChallenged = user;
            });
        });

        $scope.socket.on('game prestart', function (gameID, player1, player2) {
            var enemyPlayer = player1.userData.id == Auth.getUser().id ? player2.userData.username : player1.userData.username;
            Auth.setEnemyPlayer(enemyPlayer);
            Auth.setGameID(gameID);
            $scope.$apply(function () {
                $location.path("/game");
            });
        });

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

        $scope.socket.on("error", function (err) {
            if (err.type === 'authentication_error') {
                alert("You need to authenticate!");
                localStorage.removeItem('token');
                Auth.setUser(null);
                $window.location.reload();
            }
        });
    };

    $scope.init();

    $scope.getPlayerGames = function(userID, username)
    {
        console.log(userID);
        $scope.playerGamesUsername = username;
        $scope.socket.emit('get player games', userID);
        $scope.loaderScoresFlag = true;
    }

    $scope.goBackToLeaderboard = function(){
        $scope.showPlayerGamesFlag = false;
    }

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

    $scope.challenge = function (user, $event) {
        $($event.currentTarget).css("display", "none");
        $(".challengeButton").css("pointer-events", "none");
        $(".loader-" + user.userData.id).css("display", "inline-block");
        $scope.socket.emit('challenge', Auth.getUser(), user);
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

    $scope.accept = function () {
        $scope.socket.emit('accept', $scope.userWhoChallenged);
        //removeSnackBar("snackbarChallenge");
        $scope.loaderSnackFlag = true;
    }

    $scope.decline = function () {
        $scope.socket.emit('decline', $scope.userWhoChallenged);
        removeSnackBar("snackbarChallenge");
    }

    $scope.scrollDown = function () {
        var height = 0;
        $('#messages li').each(function (i, value) {
            height += parseInt($(this).height());
        });
        height += '';
        $('#messages').animate({ scrollTop: height });
    }
});
