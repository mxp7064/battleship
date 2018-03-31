app.controller('mainController', function ($scope, Auth, $location, $window) {

    $scope.username = "";
    $scope.isLoggedIn = false;

    //get token and ser user in the auth service
    $scope.init = function () {
        var token = localStorage.getItem("token");
        if (token) {
            var decoded = jwt_decode(token);
            var user = decoded;
            Auth.setUser(user);
        }
    };

    $scope.init();

    //watch changes to the Auth.isLoggedIn
    $scope.$watch(Auth.isLoggedIn, function (value, oldValue) {
        if (!value && oldValue) {
            $scope.username = "";
            $scope.isLoggedIn = false;
            $location.path('/login');
        }

        if (value) {
            $scope.isLoggedIn = true;
            $scope.username = Auth.getUser().username;
        }

    }, true);

    //logout user
    $scope.logout = function () {
        localStorage.removeItem('token');
        Auth.setUser(null);
        $window.location.reload();
    }
});