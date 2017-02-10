var express = require('express');
var path = require('path');
var http = require('http');
var setupSession = require('./routes/setupSession');
var swapper = require('./routes/swapper');

var app = express();
app.listen((process.env.PORT || 3000));
app.use(express.static(path.join(__dirname, 'public')));

var SECRET = 'VYD6Shiv1WRFifvuZnDj';

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

// YOYO
if(process.argv.length === 3){
    swapper.SERVER_URL = process.argv[2];
}
else{
    process.exit();
}

// if(process.argv.length !== 4){
//  console.log('Usage: node app.js botServerAddress thisServerAddress');
//  process.exit();
// }
// else{
//  var url = process.argv[2] + '/loadbalancer/?secret=' + SECRET + '&address=' + process.argv[3];
//  http.get(url, function(res) {
//      res.on('end', function() {
//          console.log('Connected. (Probably)');
//          swapper.SERVER_URL = process.argv[3];
//      });
//  }).on('error', function(e) {
//      console.log('Failed to connect to bot server');
//      console.log('Got error: ' + e.message);
//      process.exit();
//  });
// }
