app.controller('registerController', function ($scope, $http, Auth, $location) {

    $scope.submit = function() {
        $http.post('http://localhost:3000/api/register', $scope.user).then(function (res) {
            if(res.data.registerSuccessfull)
            {
                $location.path("/login");
            }
            /* var token = res.data.token;
            localStorage.setItem("token", token);
            $location.path('/lobby'); */
        }, function (res) {
            alert(res.data);
        });
    };

});