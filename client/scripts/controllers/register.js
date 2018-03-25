app.controller('registerController', function ($scope, $http, Auth, $location) {

    $scope.submit = function () {
        $http.post('http://localhost:3000/api/register', $scope.user).then(function (res) {
            if (res.data.registerSuccessfull) {
                alert("Register successful!");
                $location.path("/login");
            }
        }, function (res) {

            if (res.status == 500) {
                alert("Something went wrong, please try again later");
            }
            else if (res.status == 401 || res.status == 409) {
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