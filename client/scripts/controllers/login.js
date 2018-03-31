app.controller('loginController', function ($scope, $http, Auth, $location) {

    //submit login form, receive the token from the server and store it in local storage, set user in the auth service and redirect to lobby
    $scope.submit = function () {
        $http.post(API_URL + "/api/login", $scope.user).then(function (res) {

            var token = res.data.token;
            localStorage.setItem("token", token);

            var decoded = jwt_decode(token);
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