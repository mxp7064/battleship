app.controller('mainController', function ($scope, Auth, $location, $window) {

    $scope.username = "";
    $scope.isLoggedIn = false;

    //get token and ser user in the auth service
    $scope.init = function () {

        //detect if browser is IE, if so, show appropriate message and redirect to Chrome download page
        if (navigator.appName == 'Microsoft Internet Explorer' ||  !!(navigator.userAgent.match(/Trident/) || navigator.userAgent.match(/rv:11/)) || (typeof $.browser !== "undefined" && $.browser.msie == 1) ) {
            alert("Please don't use Internet Explorer, you will be redirected to Chrome download page!");
            $window.location.href = 'https://www.google.com/chrome/';
        }

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