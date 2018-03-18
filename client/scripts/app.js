var app = angular.module('myApp', ["ngRoute"]);

app.config(function ($routeProvider, $locationProvider) {
    $routeProvider
        .when("/login", {
            templateUrl: "views/login.html",
            controller: "loginController",
            requiresAuth: false
        })
        .when("/register", {
            templateUrl: "views/register.html",
            controller: "registerController",
            requiresAuth: false
        })
        .when("/lobby", {
            templateUrl: "views/lobby.html",
            controller: "lobbyController",
            requiresAuth: true
        })
        .when("/game", {
            templateUrl: "views/game.html",
            controller: "gameController",
            requiresAuth: true
        })
        .otherwise({
            redirectTo: '/login'
        });

    $locationProvider.hashPrefix('');
});

app.directive('myEnter', function () {
    return function (scope, element, attrs) {
        element.bind("keydown keypress", function (event) {
            if (event.which === 13) {
                scope.$apply(function () {
                    scope.$eval(attrs.myEnter);
                });
                event.preventDefault();
            }
        });
    };
});

app.run(['$rootScope', '$location', 'Auth', function ($rootScope, $location, Auth) {
    $rootScope.$on('$routeChangeStart', function (event, next, current) {

        var loggedIn = Auth.isLoggedIn();
        if (!loggedIn && next.requiresAuth) {
            $location.path('/login');
        }
        else {
            if (loggedIn && ($location.path() == "/login" || $location.path() == "/register")) {
                $location.path("/lobby");
            }
        }
    });
}]);