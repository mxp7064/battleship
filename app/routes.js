
var User = require("./models/user");
var bcrypt = require("bcrypt");
const { check, validationResult } = require('express-validator/check');
const { matchedData, sanitize } = require('express-validator/filter');
var express = require('express');
var router = express.Router();

module.exports = function (jwt) {

    //register api route which validates and sanitizes http body elements
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

        //in case there are vlidation errors send 422 and errors back to the client
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(422).json({ errors: errors.mapped() });
        }

        var email = req.body.email;
        var username = req.body.username;
        var password = req.body.password;

        //find the given user to check if the username is available
        User.findOne({ username: username }).exec(function (err, user) {
            if (err) {
                var err = new Error("Internal server error");
                err.status = 500;
                return next(err);
            } else if (user) {
                return res.status(401).json({ msg: "Username taken" });
            }
            else if (!user) {
                //also check if email is avilable
                User.findOne({ email: email }).exec(function (err, user) {
                    if (err) {
                        var err = new Error("Internal server error");
                        err.status = 500;
                        return next(err);
                    } else if (user) {
                        return res.status(409).json({ msg: "Account associated with that email already exists" });
                    }
                    else if (!user) {
                        //if the username and email are avilable then create the new user
                        var userData = {
                            email: email,
                            username: username,
                            password: password,
                            gamesWon: 0,
                            gamesLost: 0
                        }
                        User.create(userData, function (err, user) {
                            if (err) {
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

    //login api route which checks if the username and password are sent in the request
    router.post('/login', [
        check("username")
            .exists().withMessage("Username is required"),

        check('password')
            .exists().withMessage("Password is required")

    ], (req, res, next) => {

        //in case there are vlidation errors send 422 and errors back to the client
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(422).json({ errors: errors.mapped() });
        }

        var username = req.body.username;
        var password = req.body.password;

        //find the user based on username
        User.findOne({ username: username }).exec(function (err, user) {
            if (err) {
                var err = new Error("Internal server error");
                err.status = 500;
                return next(err);
            } else if (!user) {
                //if there is no user with that username (wrong username)
                return res.status(401).json({ msg: "Username or password wrong" });
            }
            //if username exists then check the password
            bcrypt.compare(password, user.password, function (err, result) {
                if (result === true) {
                    //if password is correct, create the token and send it back to client
                    var data = { username: user.username, id: user._id };
                    var token = jwt.sign(data, "najvecatajnanasvijetu", { expiresIn: '1h' });
                    res.json({ token: token });
                } else {
                    //wrong password
                    return res.status(401).json({ msg: "Username or password wrong" });
                }
            })
        });

    });

    return router;
}