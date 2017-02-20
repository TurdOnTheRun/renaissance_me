var express = require('express');
var path = require('path');
var http = require('http');
var getIP = require('external-ip')();
var setupSession = require('./routes/setupSession');
var swapper = require('./routes/swapper');
var deleter = require('./routes/deleter');

var PORT = 3000;
var SECRET = 'VYD6Shiv1WRFifvuZnDj';
var RM_CHATBOT = 'http://renaissance-me.herokuapp.com/';

var app = express();
app.listen(PORT);
app.use(function (req, res, next) {
    var directory = path.dirname(req.url);
    var directories = directory.split('/');
    if(directories.length === 3){
        var sessionId = directories[directories.length - 1];
        setTimeout(function(){
            deleter(sessionId, req.url);
        }, 10000);
    }
    next();
});
app.use(express.static(path.join(__dirname, 'public')));

/* GET home page. */
app.get('/', function(req, res, next) {
    if(req.query.imgUrl){
        setupSession.start(decodeURIComponent(req.query.imgUrl), res);
    }
    else if(req.query.session){
        var session;
        try{
            session = JSON.parse(req.query.session);
        }
        catch(err){
            console.log('Failed to parse session');
        }
        swapper.faceSwap(session, function(result){ res.json(result); });
    }
    else{
        res.json({ success:false });
    }
});

getIP(function (err, ip) {
    if (err) {
        console.log('Failed to get IP');
        throw err;
    }
    var hostAddress = 'http://' + ip + ':' + PORT + '/';
    console.log('Host-address: ' + hostAddress);
    swapper.setServerUrl(hostAddress);
    var url = RM_CHATBOT + 'loadbalancer/?secret=' + SECRET + '&address=' + hostAddress;
    http.get(url, function(res){
        res.on('end', function(){
            console.log('Connected. (Probably)');
        });
    }).on('error', function(e){
        console.log('Failed to connect to bot server');
        console.log('Got error: ' + e.message);
        process.exit();
    });
});
