var mongoose = require("mongoose");
var Schema = mongoose.Schema;

//Mongoose message schema
var MessageSchema = new mongoose.Schema({
    userID: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true,
        trim: true
    },
    time: {
        type: Date,
        required: true
    },
    msg: {
        type: String,
        required: true,
        trim: true
    }
});

module.exports = mongoose.model('Message', MessageSchema);