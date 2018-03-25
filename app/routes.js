
var User = require("./models/user");
var bcrypt = require("bcrypt");
const { check, validationResult } = require('express-validator/check');
const { matchedData, sanitize } = require('express-validator/filter');

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

    router.post('/register', [
        check('email')
            .exists().withMessage("Email is required")
            .isEmail().withMessage('Invalid email address')
            .trim()
            .normalizeEmail(),

        check('username')
            .exists().withMessage("Username is required")
            .isLength({ min: 5 }).withMessage("Username must be at least 5 characters long")
            .isLength({ max: 20 }).withMessage("Username must be less than 20 characters long")
            .trim(),

        check('password')
            .exists().withMessage("Password is required")
            .isLength({ min: 5 }).withMessage("Password must be at least 5 characters long")
            .isLength({ max: 20 }).withMessage("Password must be less than 20 characters long")
            .trim(),

        sanitize("username").escape()

    ], (req, res, next) => {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(422).json({ errors: errors.mapped() });
        }

        var email = req.body.email;
        var username = req.body.username;
        var password = req.body.password;

        User.findOne({ username: username }).exec(function (err, user) {
            if (err) {
                var err = new Error("Internal server error");
                err.status = 500;
                return next(err);
            } else if (user) {
                return res.status(401).json({ msg: "Username taken" });
            }
            else if (!user) {
                User.findOne({ email: email }).exec(function (err, user) {
                    if (err) {
                        var err = new Error("Internal server error");
                        err.status = 500;
                        return next(err);
                    } else if (user) {
                        return res.status(409).json({ msg: "Account associated with that email already exists" });
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
                                console.log(err)//logaj ovake errore
                                var err = new Error("Internal server error");
                                err.status = 500;
                                return next(err);
                            } else {
                                res.json({ registerSuccessfull: true });
                            }
                        });
                    }
                });
            }
        });

    });

    router.post('/login', [
        check("username")
            .exists().withMessage("Username is required"),

        check('password')
            .exists().withMessage("Password is required")

    ], (req, res, next) => {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(422).json({ errors: errors.mapped() });
        }

        var username = req.body.username;
        var password = req.body.password;

        User.findOne({ username: username }).exec(function (err, user) {
            if (err) {
                var err = new Error("Internal server error");
                err.status = 500;
                return next(err);
            } else if (!user) {
                //actually: no user with that username (wrong username)
                return res.status(401).json({ msg: "Username or password wrong" });
            }
            bcrypt.compare(password, user.password, function (err, result) {
                if (result === true) {
                    var data = { username: user.username, id: user._id };
                    var token = jwt.sign(data, "najvecatajnanasvijetu", { expiresIn: '1h' });
                    res.json({ token: token });
                } else {
                    //actually: wrong password
                    return res.status(401).json({ msg: "Username or password wrong" });
                }
            })
        });

    });

    return router;
}