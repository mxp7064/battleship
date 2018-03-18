var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var GameSchema = new mongoose.Schema({
    winnerID: {
        type: String,
        required: true
    },
    loserID: {
        type: String,
        required: true
    },
    players: {
        type: String,
        required: true
    },
    winnerHits: {
        type: Number,
        required: true
    },
    loserHits: {
        type: Number,
        required: true
    },
    forfeit: {
        type: Boolean
    },
    timeFinished: {
        type: Date,
        required: true
    }
});

module.exports = mongoose.model('Game', GameSchema);