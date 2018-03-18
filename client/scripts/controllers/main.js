app.controller('mainController', function ($scope, Auth, $location, $window) {

    $scope.username = "";
    $scope.isLoggedIn = false;

    $scope.init = function(){
        var token = localStorage.getItem("token");
        if (token) {
            var decoded = jwt_decode(token);
            var user = decoded;
            
            Auth.setUser(user);
        }
    };

    $scope.init();

    $scope.$watch(Auth.isLoggedIn, function (value, oldValue) {
            if(!value && oldValue) {
                console.log("Disconnect");
                $scope.username = "";
                $scope.isLoggedIn = false;
                $location.path('/login');
              }
          
              if(value) {
                console.log("Connect");
                $scope.isLoggedIn = true;
                $scope.username = Auth.getUser().username;
              }
        
    }, true);  

    $scope.logout = function () {
        localStorage.removeItem('token');
        Auth.setUser(null);
        $window.location.reload();
    }
});