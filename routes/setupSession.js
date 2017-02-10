var express = require('express');
var fs = require( 'fs' );
var child = require('child_process');
var path = require('path');
var Shuffle = require('shuffle');
var s3 = require('s3');
var swapper = require('./swapper');

var router = express.Router();
var singleFaceExtractor = 'python ' + path.join(__dirname, '../python', 'dlibSingleFaceExtractor.py ');
var client = s3.createClient({
    s3RetryDelay: 200, // this is the default 
    s3Options: {
        accessKeyId: 'AKIAINH4LYDSG4E54I7A',
        secretAccessKey: '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',
    },
});

var painting_magnitudes = JSON.parse(fs.readFileSync('magnitudes.json', 'utf8')); 
var S3_BUCKET_NAME = 'renaissanceme';

//Needs to be implemented
var setupSession = function(session, res){
    // session = {magnitudes, sessionId, face_count, faces} 
    // console.log(result.magnitudes);

    var faceSwapCallback = function(result){
        // result = {success, session}
        return res.json(result);
    };

    var paintings = painting_magnitudes[session.magnitudes];

    if(!paintings){
        return res.json({success:false, msg:'NO_PAINTINGS_W_MAG', mag: session.magnitudes, error: 2});
    }

    var numberArray = Array.apply(null, {length: paintings.length}).map(Number.call, Number);
    var deck = Shuffle.shuffle({deck: numberArray});
    session.collection = deck.cards;
    session.index = 0;
    swapper.faceSwap(session, faceSwapCallback);
};

var getFaces = function(imagePath, res){
    // console.log('Extracting Faces for: ' + imagePath + '\n');
    
    var c = child.exec(singleFaceExtractor + '"' + imagePath + '"', function(error, stdout, stderr) {
        if (error) {
            console.log('faceExtractor.py error: ' + error);
        }
        if(stderr){
            console.log('faceExtractor.py stderr: ' + stderr);
        }
        if(stdout){
            var result = JSON.parse(stdout);
            if(result.success){
                var uploaded = 0;
                for(var i=0; i < result.session.faces.length; i++){
                    var face = result.session.faces[i];
                    var params = {
                        localFile: face.image_path,
                     
                        s3Params: {
                            Bucket: S3_BUCKET_NAME,
                            Key: face.image_path,
                            ACL: 'public-read',
                        },
                    };
                    var uploader = client.uploadFile(params);
                    uploader.on('error', function(err){
                        console.error("unable to upload:", err.stack);
                        result.success = false;
                        return res.json(result);
                    });
                    uploader.on('end', function(){
                        uploaded++;
                        if(uploaded === result.session.faces.length){
                            return setupSession(result.session, res);
                        }
                    });
                }
            }
            else{
                // console.log(result.msg);
                return res.json(result);
            }
        }
    });

    c.on('exit', function (code){
        if(code === 1){
            return res.json({'success': false, 'msg': 'ERROR_FACE_EXTRACTOR', 'error': 0});
        }
    });
};

router.start = getFaces;
module.exports = router;

// ERRORS:
// 0: Wrong piping or error in execution
// 1: No Faces in input
// 2: No paintings match magnitudes