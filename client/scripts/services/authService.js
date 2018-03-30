app.factory('Auth', function () {
    var user;
    var loggedIn = false;
    var socket = null;
    var gameID;
    var enemeyPlayer;
    return {
        getUser: function () {
            return user;
        },
        setUser: function (aUser) {
            user = aUser;
        },
        isLoggedIn: function () {
            return (user) ? user : false;
        },
        setSocket: function(){
            socket = io.connect(API_URL, {
                query: 'token=' + localStorage.getItem("token")
            });
        },
        getSocket: function () {
            return socket;
        },
        setGameID: function(agameID){
            gameID = agameID;
        },
        getGameID: function(){
            return gameID;
        },
        setEnemyPlayer: function(p){
            enemeyPlayer = p;
        },
        getEnemyPlayer: function(){
            return enemeyPlayer;
        }
    }
});
