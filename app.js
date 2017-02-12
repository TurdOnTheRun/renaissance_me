var express = require('express');
var path = require('path');
var http = require('http');
var setupSession = require('./routes/setupSession');
var swapper = require('./routes/swapper');

var SECRET = 'VYD6Shiv1WRFifvuZnDj';
var RM_CHATBOT = 'https://renaissance-me.herokuapp.com/';

var app = express();
app.use(express.static(path.join(__dirname, 'public')));

/* GET home page. */
app.get('/', function(req, res, next) {
    if(req.query.imgUrl){
        setupSession.start(decodeURIComponent(req.query.imgUrl), res);
    }
    else if(req.query.session){
        var session;
        try{
            session = JSON.parse(req.query.session).session;
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

var server = app.listen((process.env.PORT || 3000), function(){
    var hostAddress = server.address().address + ':' + server.address().port;
    console.log(hostAddress);
    var url = RMCHATBOT + 'loadbalancer/?secret=' + SECRET + '&address=' + hostAddress;
    swapper.setServerUrl(hostAddress);
    // http.get(url, function(res){
    //     res.on('end', function(){
    //         console.log('Connected. (Probably)');
    //     });
    // }).on('error', function(e){
    //     console.log('Failed to connect to bot server');
    //     console.log('Got error: ' + e.message);
    //     process.exit();
    // });
});
