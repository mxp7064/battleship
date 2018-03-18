app.controller('loginController', function ($scope, $http, Auth, $location) {
    $scope.submit = function() {
        $http.post('http://localhost:3000/api/login', $scope.user).then(function (res) {
            var token = res.data.token;
            localStorage.setItem("token", token);

            var decoded = jwt_decode(token);
            console.log(decoded);
            var user = decoded;
            
            Auth.setUser(user);
            
            $location.path('/lobby');
        }, function (res) {
            alert(res.data);
        });
    };
});