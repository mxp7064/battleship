app.controller('loginController', function ($scope, $http, Auth, $location) {
    $scope.submit = function () {
        $http.post('http://localhost:3000/api/login', $scope.user).then(function (res) {

            var token = res.data.token;
            localStorage.setItem("token", token);

            var decoded = jwt_decode(token);
            console.log(decoded);
            var user = decoded;

            Auth.setUser(user);
            $location.path('/lobby');

        }, function (res) {
            if (res.status == 500) {
                alert("Something went wrong, please try again later");
            }
            else if (res.status == 401) {
                alert(res.data.msg);
            }
            else if (res.status == 422) {
                var message = "";
                var errors = res.data.errors;
                for (var e in errors) {
                    message += errors[e].msg + "\n";
                }
                alert(message);
            }
        });
    };
});