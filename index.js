var express = require('express');
var app = express();
var router = express.Router();

var http = require('http').Server(app);
var io = require('socket.io')(http);

var jwt = require('jsonwebtoken');

app.use('/scripts/jwt-decode', express.static(__dirname + '/node_modules/jwt-decode/build/'));

var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const expressValidator = require('express-validator');
app.use(expressValidator());

//serve client files so they are available to the client and handle get requests by serving the index.html file
app.use(express.static(__dirname + '/client'));
const path = require('path');
app.get('/*', function (req, res) {
    res.sendFile(path.join(__dirname + '/client/index.html'));
});

var routes = require('./app/routes.js')(jwt, router);
app.use('/api', routes);

require('./app/socketio')(io, jwt);

app.use(function (err, req, res, next) {
    console.error(err.stack);
    res.status(err.status || 500);
    res.send(err.message);
}); 



http.listen(3000, function () {
    console.log('listening on *:3000');
});
