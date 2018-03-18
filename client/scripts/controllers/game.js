app.controller('gameController', function ($scope, $http, Auth, $location, $window) {

    var tileSize = 50;
    var ships;
    var playerPanel = Snap("#playerPanel");
    var targetingPanel = Snap("#targetingPanel");
    $scope.socket;
    $scope.loggedInUser;
    $scope.gameID;
    $scope.readyFlag = true;//true is for ready to show, false is for forfeit
    $scope.gameStatusMsg = "Set up your ships! Drag to move them and double-click ship to change ship direction!";
    $scope.turn = false;//my turn is true, other player turn is false
    $scope.snackBarMessage;
    $scope.enemyPlayer;

    $scope.init = function () {
        createPlayerPanelBoard();
        createTargetingBoard();
        initShips();

        $scope.loggedInUser = Auth.getUser();
        var s = Auth.getSocket();
        if (s == null || s == undefined) {
            Auth.setSocket();
            s = Auth.getSocket();
        }
        $scope.socket = s;
        $scope.gameID = Auth.getGameID();
        $scope.enemyPlayer = Auth.getEnemyPlayer();
        $scope.socket.on('game start', function (whooseTurnItIs) {
            $scope.$apply(function () {
                $scope.readyFlag = false;
                //$scope.$apply(function () {
                $scope.snackBarMessage = "The match has started! Good luck!";
                showSnackBar();
                //});

                if (whooseTurnItIs == Auth.getUser().id) {
                    $scope.turn = true;
                    $scope.gameStatusMsg = "It's your turn! Select a tile on the targeting board!"
                }
                else {
                    $scope.turn = false;
                    $scope.gameStatusMsg = "Wait for the enemy's turn!"
                }


            });
        });

        $scope.socket.on('other player forfeited', function (username) {
            alert(username + " forfeited the game, you win!");
            $scope.$apply(function () {
                $location.path("/lobby");
            });
        });

        $scope.socket.on('shoot result', function (shootResult, whooseTurnItIs, point) {
            console.log(shootResult);
            //red for "hit", white for "miss"
            //sto ako user klikne 2 ili vise puta brzo (gadajuci na targeting panel a turn se jos nije promijenio)
            if (whooseTurnItIs == Auth.getUser().id) {//kad si ti gado pa dobio result toga
                if (shootResult.isHit) {
                    markRedTargetingBoard(point);
                    explosionAnim(point.x * 50, point.y * 50, targetingPanel);
                    if (shootResult.isSunk) {
                        $scope.$apply(function () {
                            $scope.snackBarMessage = "You sunk enemy's " + shootResult.shipName;
                        });
                        showSnackBar();
                        //mozes ga revelat ako uspijes to napravit
                    }
                    else {
                        $scope.$apply(function () {
                            $scope.snackBarMessage = "Hit";
                        });
                        showSnackBar("Hit");
                    }
                }
                else {
                    $scope.$apply(function () {
                        $scope.snackBarMessage = "Miss";
                    });
                    showSnackBar();//whie oznaci na targeting boardu
                    markBlueTargetingBoard(point);
                    //btw onemoguci da gada one koje je vec pogodio
                }
                $scope.$apply(function () {
                    $scope.turn = false;
                    $scope.gameStatusMsg = "Wait for the enemy's turn!"
                });

            }
            else {//kad je tebe ovaj drugi gado pa si dobio result toga
                if (shootResult.isHit) {
                    explosionAnim(point.x * 50, point.y * 50, playerPanel);
                    markRedPlayerBoard(point);
                    if (shootResult.isSunk) {
                        $scope.$apply(function () {
                            $scope.snackBarMessage = "Enemy sank your " + shootResult.shipName;
                        });
                        showSnackBar();
                    }
                    else {
                        $scope.$apply(function () {
                            $scope.snackBarMessage = "You were hit!";
                        });
                        showSnackBar();
                    }
                }
                else {
                    $scope.$apply(function () {
                        $scope.snackBarMessage = "Enemy missed!"
                    });
                    showSnackBar();
                    markBluePlayerBoard(point);
                }
                $scope.$apply(function () {
                    $scope.turn = true;
                    $scope.gameStatusMsg = "It's your turn! Select a tile on the targeting board!";
                });

            }
        });

        $scope.socket.on('game end you win', function (data) {
            console.log("you win");
            $scope.$apply(function () {
                $scope.turn = false;
                $scope.gameStatusMsg = "Congratulations, you won!";
                $scope.snackBarMessage = "Congratulations, you won!";

            });
            showSnackBar();
            setTimeout(function () {
                $scope.$apply(function () {
                    $location.path("/lobby");
                });
            }, 3000);

        });

        $scope.socket.on('game end you lose', function (data) {
            console.log("you lose");
            $scope.$apply(function () {
                $scope.turn = false;
                $scope.gameStatusMsg = "You lost!";
                $scope.snackBarMessage = "You lost!";

            });
            showSnackBar();
            setTimeout(function () {
                $scope.$apply(function () {
                    $location.path("/lobby");
                });
            }, 3000);
        });
    };

    function showSnackBar() {
        removeSnackBar();
        $("#snackBar").addClass("show");
        setTimeout(removeSnackBar, 3000);
    }

    function removeSnackBar() {
        $("#snackBar").removeClass("show");
    }

    function markRedTargetingBoard(point) {
        $("#targetingPanel .tile[data-x='" + point.x + "'][data-y='" + point.y + "']").addClass("tileHitRed");
    }

    function markBlueTargetingBoard(point) {
        $("#targetingPanel .tile[data-x='" + point.x + "'][data-y='" + point.y + "']").addClass("tileMissBlue");
    }


    function markRedPlayerBoard(point) {
        $("#playerPanel .tile[data-x='" + point.x + "'][data-y='" + point.y + "']").addClass("tileHitRed");
    }

    function markBluePlayerBoard(point) {
        $("#playerPanel .tile[data-x='" + point.x + "'][data-y='" + point.y + "']").addClass("tileMissBlue");
    }




    $scope.init();

    $scope.forfeit = function () {
        if (confirm('Are you sure you want to forfeit the game?')) {
            $scope.socket.emit("forfeit", $scope.gameID, Auth.getUser());
            $location.path("/lobby");
        }
    }

    $scope.ready = function () {
        $scope.readyFlag = false;
        $scope.socket.emit("ships", $scope.gameID, ships);
        ships.forEach((ship) => {
            ship.rect.undrag();
            ship.rect.undblclick();
        });
        $scope.gameStatusMsg = "Waiting for the other player to get ready!";
    }



    function initShips() {
        var gridSize = 50;
        var orig = {
            x: 0,
            y: 0
        };

        var carrierRect = playerPanel.image("images/carrier.png", 100, 150, 250, 50);
        var battleshipRect = playerPanel.image("images/battleship.png", 100, 250, 200, 50);
        var cruiserRect = playerPanel.image("images/cruiser.png", 100, 350, 150, 50);
        var submarineRect = playerPanel.image("images/submarine.png", 300, 350, 150, 50);
        var destroyerRect = playerPanel.image("images/destroyer.png", 350, 250, 100, 50);

        var carrier = {
            name: "Carrier",
            rect: carrierRect,
            direction: "hor",
            top: { x: null, y: null },
            coordinates: [{ loc: { x: null, y: null }, hit: false }, { loc: { x: null, y: null }, hit: false }, { loc: { x: null, y: null }, hit: false }, { loc: { x: null, y: null }, hit: false }, { loc: { x: null, y: null }, hit: false }
            ]
        };

        var battleship = {
            name: "Battleship",
            rect: battleshipRect,
            direction: "hor",
            top: { x: null, y: null },
            coordinates: [{ loc: { x: null, y: null }, hit: false }, { loc: { x: null, y: null }, hit: false }, { loc: { x: null, y: null }, hit: false }, { loc: { x: null, y: null }, hit: false }
            ]
        };

        var cruiser = {
            name: "Cruiser",
            rect: cruiserRect,
            direction: "hor",
            top: { x: null, y: null },
            coordinates: [{ loc: { x: null, y: null }, hit: false }, { loc: { x: null, y: null }, hit: false }, { loc: { x: null, y: null }, hit: false }
            ]
        };

        var submarine = {
            name: "Submarine",
            rect: submarineRect,
            direction: "hor",
            top: { x: null, y: null },
            coordinates: [{ loc: { x: null, y: null }, hit: false }, { loc: { x: null, y: null }, hit: false }, { loc: { x: null, y: null }, hit: false }
            ]
        };

        var destroyer = {
            name: "Destroyer",
            rect: destroyerRect,
            direction: "hor",
            top: { x: null, y: null },
            coordinates: [{ loc: { x: null, y: null }, hit: false }, { loc: { x: null, y: null }, hit: false }
            ]
        };

        ships = [carrier, battleship, cruiser, submarine, destroyer];

        setShips();

        ships.forEach((ship) => {
            var shipRect = ship.rect;
            shipRect.dblclick(() => {

                changeHorVer(ship);

                if (checkCollisions(ship)) {
                    changeHorVer(ship);//"roll back change by toggling again"
                }
                else {
                    if (ship.direction == "ver") {
                        ship.rect.transform(`translate(50) rotate(90, ${ship.top.x * 50}, ${ship.top.y * 50})`);
                    }
                    else {
                        ship.rect.transform(`rotate(0 ${ship.top.x * 50} ${ship.top.y * 50})`);
                    }
                }
            });

            shipRect.attr({
                fill: "#C0C0C0",
                stroke: "black",
                strokeWidth: 1,
                class: "draggable"
            });

            shipRect.drag(
                function (dx, dy, x, y, e) {
                    var xSnap = Snap.snapTo(gridSize, orig.x + dx, 100000000);
                    var ySnap = Snap.snapTo(gridSize, orig.y + dy, 100000000);

                    var previousX = this.attr("x");
                    var previouseY = this.attr("y");

                    if (xSnap == previousX && ySnap == previouseY) return;

                    if (xSnap >= 50 && xSnap <= 500) {
                        this.attr({ x: xSnap });
                    }
                    if (ySnap >= 50 && ySnap <= 500) {
                        this.attr({ y: ySnap });
                    }

                    ship.top.x = this.attr("x") / 50;
                    ship.top.y = this.attr("y") / 50;

                    setShipCoordinates(ship);

                    if (checkCollisions(ship)) {
                        this.attr({ x: previousX, y: previouseY });

                        ship.top.x = previousX / 50;
                        ship.top.y = previouseY / 50;

                        setShipCoordinates(ship);
                    }

                    if (ship.direction == "ver")
                        ship.rect.transform(`translate(50) rotate(90, ${ship.top.x * 50}, ${ship.top.y * 50})`);
                },
                function (x, y, e) {
                    orig.x = e.target.x.baseVal.value;
                    orig.y = e.target.y.baseVal.value;
                },
                function (e) {

                }
            );
        });
    };

    function setShips() {
        ships.forEach((ship) => {
            ship.top.x = ship.rect.attr("x") / 50;
            ship.top.y = ship.rect.attr("y") / 50;

            setShipCoordinates(ship);
        })
    }

    function setShipCoordinates(ship) {
        if (ship.direction == "hor") {
            for (i = 0; i < ship.coordinates.length; i++) {
                ship.coordinates[i].loc.x = (ship.top.x + i);
                ship.coordinates[i].loc.y = ship.top.y;
            }
        }
        else {
            for (i = 0; i < ship.coordinates.length; i++) {
                ship.coordinates[i].loc.y = (ship.top.y + i);
                ship.coordinates[i].loc.x = ship.top.x;
            }
        }
    }

    function changeHorVer(ship) {
        if (ship.direction == "hor") {
            ship.direction = "ver";
            for (i = 0; i < ship.coordinates.length; i++) {
                ship.coordinates[i].loc.y = (ship.top.y + i);
                ship.coordinates[i].loc.x = ship.top.x;
            }
        }
        else {
            ship.direction = "hor";
            for (i = 0; i < ship.coordinates.length; i++) {
                ship.coordinates[i].loc.x = (ship.top.x + i);
                ship.coordinates[i].loc.y = ship.top.y;
            }

        }
    }

    function checkCollisions(ship) {
        var flag = false;
        ship.coordinates.forEach((c) => {
            if (checkPointCollisions(c.loc, ship) || c.loc.x > 10 || c.loc.y > 10)
                flag = true;
        });
        //no collision
        return flag;
    }

    function checkPointCollisions(point, sh) {
        for (i = 0; i < ships.length; i++) {
            if (ships[i].name != sh.name) {
                for (j = 0; j < ships[i].coordinates.length; j++) {
                    var c = ships[i].coordinates[j];
                    if (c.loc.x == point.x && c.loc.y == point.y) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    function createSVG(tag) {
        return document.createElementNS('http://www.w3.org/2000/svg', tag);
    }

    function createPlayerPanelBoard() {
        for (i = 0; i < 11; i++) {
            for (j = 0; j < 11; j++) {

                //this is for the letters on the left side
                if (i == 0) {
                    var g = $(createSVG("g"));
                    $(createSVG('rect')).attr('x', i * tileSize).attr('y', j * tileSize).attr("width", tileSize).attr("height", tileSize).attr("class", "tile edgeTile").appendTo(g);
                    if (j != 0)
                        $(createSVG('text')).attr('x', i * tileSize + tileSize / 2).attr('y', j * tileSize + tileSize / 2).attr("class", "textTile").attr("text-anchor", "middle").attr("alignment-baseline", "middle").text(String.fromCharCode(64 + j)).appendTo(g);
                    g.appendTo($('#playerPanel'));
                }
                else//this is for the game tiles
                {
                    var tile = $(createSVG('rect')).attr('x', i * tileSize).attr('y', j * tileSize).attr("width", tileSize).attr("height", tileSize).attr("class", "tile droppable").attr("data-x", `${i}`).attr("data-y", `${j}`);
                    tile.appendTo($('#playerPanel'));
                }

                //this is for the numbers on top
                if (j == 0) {
                    var g = $(createSVG("g"));
                    $(createSVG('rect')).attr('x', i * tileSize).attr('y', j * tileSize).attr("width", tileSize).attr("height", tileSize).attr("class", "tile edgeTile").appendTo(g);
                    if (i != 0)
                        $(createSVG('text')).attr('x', i * tileSize + tileSize / 2).attr('y', j * tileSize + tileSize / 2).attr("class", "textTile").attr("text-anchor", "middle").attr("alignment-baseline", "middle").text(i).appendTo(g);
                    g.appendTo($('#playerPanel'));
                }

            }
        }
    }

    function createTargetingBoard() {
        for (i = 0; i < 11; i++) {
            for (j = 0; j < 11; j++) {

                //this is for the letters on the left side
                if (i == 0) {
                    var g = $(createSVG("g"));
                    $(createSVG('rect')).attr('x', i * tileSize).attr('y', j * tileSize).attr("width", tileSize).attr("height", tileSize).attr("class", "tile edgeTile").appendTo(g);
                    if (j != 0)
                        $(createSVG('text')).attr('x', i * tileSize + tileSize / 2).attr('y', j * tileSize + tileSize / 2).attr("class", "textTile").attr("text-anchor", "middle").attr("alignment-baseline", "middle").text(String.fromCharCode(64 + j)).appendTo(g);
                    g.appendTo($('#targetingPanel'));
                }
                else {
                    var tile = $(createSVG('rect')).attr('x', i * tileSize).attr('y', j * tileSize).attr("width", tileSize).attr("height", tileSize).attr("class", "tile tileData").attr("data-x", `${i}`).attr("data-y", `${j}`);
                    tile.click(function () {
                        //console.log(`[${$(this).attr("data-x")}, ${$(this).attr("data-y")}]`);
                        if ($scope.turn) {
                            var x50 = $(this).attr("x");
                            var y50 = $(this).attr("y");
                            console.log(`[${x50}, ${y50}]`);
                            var x = x50 / 50;
                            var y = y50 / 50;
                            $scope.turn = false;
                            $scope.socket.emit("shoot", $scope.gameID, { x: x, y: y });
                            //explosionAnim(x, y, targetingPanel);
                        }

                    });
                    tile.appendTo($('#targetingPanel'));
                }

                //this is for the numbers on top
                if (j == 0) {
                    var g = $(createSVG("g"));
                    $(createSVG('rect')).attr('x', i * tileSize).attr('y', j * tileSize).attr("width", tileSize).attr("height", tileSize).attr("class", "tile edgeTile").appendTo(g);
                    if (i != 0)
                        $(createSVG('text')).attr('x', i * tileSize + tileSize / 2).attr('y', j * tileSize + tileSize / 2).attr("class", "textTile").attr("text-anchor", "middle").attr("alignment-baseline", "middle").text(i).appendTo(g);
                    g.appendTo($('#targetingPanel'));
                }

            }
        }
    }

    function explosionAnim(x, y, panel) {

        var g = panel.g();

        for (i = 0; i < 100; i++) {
            var c = getRandomArbitrary(10, 50);
            var a;
            var b;
            if (Math.random() < 0.5) {
                a = Math.floor(Math.random() * c * halfChance());
                b = Math.sqrt(Math.pow(c, 2) - Math.pow(a, 2)) * halfChance();
            }
            else {
                b = Math.floor(Math.random() * c * halfChance());
                a = Math.sqrt(Math.pow(c, 2) - Math.pow(b, 2)) * halfChance();
            }

            var colors = ["#ff5000", "#ff6a00", "#ff3f00", "#ff5d00", "#ff7700", "#ff9000", "#ffaa00", "#ffbf00", "#ffcc00", "#ffd800", "#fff200"];
            var rect = panel.rect(x + 20, y + 20, getRandomArbitrary(9, 12), getRandomArbitrary(9, 12), 3, 3).attr({ id: i + "", fill: colors[getRandomInt(colors.length)] }).animate({ transform: `translate(${a} ${b}) `, "fill-opacity": "0" }, Math.floor(getRandomArbitrary(1000, 2000)), mina.easein);

            g.add(rect);
        }

        setTimeout(() => { g.remove(); }, 2100);
    }

    function halfChance() {
        return Math.random() < 0.5 ? -1 : 1;
    }

    function getRandomInt(max) {
        return Math.floor(Math.random() * Math.floor(max));
    }

    function getRandomArbitrary(min, max) {
        return Math.random() * (max - min) + min;
    }



});