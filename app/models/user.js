var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var bcrypt = require("bcrypt");
var validator = require('validator');

//mongoose user schema
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
        trim: true,
        minlength: 5,
        maxlength: 20
    },
    password: {
        type: String,
        required: true,
        minlength: 5,
        maxlength: 20
    },
    gamesWon: {
        type: Number
    },
    gamesLost: {
        type: Number
    }
});

//hash the password before saving the user to the database
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