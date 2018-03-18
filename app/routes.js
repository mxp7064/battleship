
var User = require("./models/user");
var bcrypt = require("bcrypt");
module.exports = function (jwt, router) {
    var mongoose = require("mongoose");
    mongoose.connect("mongodb://localhost/Battleship");

    var db = mongoose.connection;

    db.on("error", function () {
        console.log("connection error");
    });
    db.once("open", function () {
        console.log("connection open!");
    });

    
    router.post('/register', (req, res, next) => {
        var email = req.body.email;
        var username = req.body.username;
        var password = req.body.password;

        if (email && username && password) {
            User.findOne({ username: username }).exec(function (err, user) {
                if (err) {
                    var err = new Error("Internal server error");
                    err.status = 500;
                    return next(err);
                } else if (user) {
                    var err = new Error('username taken');
                    err.status = 401;
                    return next(err);
                }
                else if (!user) {
                    User.findOne({ email: email }).exec(function (err, user) {
                        if (err) {
                            //var err = new Error("Internal server error");
                            err.status = 500;
                            return next(err);
                        } else if (user) {
                            //var err = new Error('account associated with that email already exists');
                            err.status = 409;
                            return next(err);
                        }
                        else if (!user) {
                            var userData = {
                                email: email,
                                username: username,
                                password: password,
                                gamesWon: 0,
                                gamesLost: 0
                            }
                            User.create(userData, function (err, user) {
                                if (err) {
                                    //var err = new Error("Internal server error");
                                    err.status = 500;
                                    return next(err);
                                } else {
                                    /* var token = jwt.sign({ username: userData.username }, secret, { expiresIn: '1h' });
                                    res.json({ token: token }); */
                                    res.json({ registerSuccessfull: true }); 
                                }
                            });
                        }
                    });
                }
            });
        }
        else {
            //var err = new Error("Request data missing");
            err.status = 400;
            return next(err);
        }
    });


    router.post('/login', (req, res, next) => {
        var username = req.body.username;
        var password = req.body.password;
    
        if (username && password) {
            User.findOne({ username: username }).exec(function (err, user) {
                if (err) {
                    //var err = new Error("Internal server error");
                    err.status = 500;
                    return next(err);
                } else if (!user) {
                    //var err = new Error('username or password wrong');//no user with that username
                    err.status = 401;
                    return next(err);
                }
                bcrypt.compare(password, user.password, function (err, result) {
                    if (result === true) {
                        var data = { username: user.username, id: user._id };
                        var token = jwt.sign(data, "najvecatajnanasvijetu", { expiresIn: '1h' });
                        res.json({ token: token });
                    } else {
                        //var err = new Error('username or password wrong');//wrong password
                        err.status = 401;
                        return next(err);
                    }
                })
            });
        }
        else {
            //var err = new Error("Request data missing");
            err.status = 400;
            return next(err);
        }
    });

    /* router.post('/login', function (req, res) {

        // TODO: validate the actual user user
        var profile = {
            first_name: 'John',
            last_name: 'Doe',
            email: 'john@doe.com',
            id: 123
        };

        //napravi na nacin da jedino ako je user uspjesno authenticated da mu returnas token, otherwise hendlaj

        // we are sending the profile in the token
        var token = jwt.sign(profile, secret, { expiresIn: '1h' });

        res.json({ token: token });
    }); */


    return router;
}