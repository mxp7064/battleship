var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var bcrypt = require("bcrypt");
var validator = require('validator');

var UserSchema = new mongoose.Schema({
    email: {
        required: true,
        type: String,
        trim: true,
        lowercase: true,
        unique: true,
        validate: { validator: validator.isEmail , message: 'Invalid email.' }
    },
    username: {
        type: String,
        unique: true,
        required: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
    },
    gamesWon: {
        type: Number
    },
    gamesLost: {
        type: Number
    }
});

UserSchema.pre('save', function (next) {
    var user = this;
    bcrypt.hash(user.password, 10, function (err, hash) {
        if (err) {
            var err = new Error("Internal server error");
            err.status = 500;
            return next(err);
        }
        user.password = hash;
        next();
    })
});

module.exports = mongoose.model('User', UserSchema);