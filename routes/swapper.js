var express = require('express');
var fs = require( 'fs' );
var child = require('child_process');
var path = require('path');

var router = express.Router();
var faceSwap = 'python ' + path.join(__dirname, '../python', 'faceSwap.py ');
var faceInsert = 'python ' + path.join(__dirname, '../python', 'insertSwapedFaces.py ');

var painting_datas = JSON.parse(fs.readFileSync('faceDatabase.json', 'utf8'));
var painting_magnitudes = JSON.parse(fs.readFileSync('magnitudes.json', 'utf8'));

var PATH_TO_SESSIONS = path.join(__dirname, '..', '/sessions/');
var PATH_TO_PORTRAIT_FACES = path.join(__dirname, '..', '/faces/');
var PATH_TO_OUTPUTS = path.join(__dirname, '..', '/public/images/');
var SERVER_URL;
var S3_BUCKET_URL = 'https://s3.amazonaws.com/renaissanceme/';

var insertFaces = function(session, callback){

    var callFaceInsert = function(paintingId, pathToOutput, pathsToSwappedHeads, callback){

        var c = child.exec(faceInsert + paintingId + ' ' + pathToOutput + ' ' + pathsToSwappedHeads, function(error, stdout, stderr) {
            if (error) {
                console.log('faceInsert error: ' + error);
            }
            if(stderr){
                console.log('Insertfaces.py stderr: ' + stderr);
            }
            if(stdout){
                // console.log(stdout);
            }
        });
    
        c.on('exit', function (code){
            if(code !== 0){
                console.log('insertFaces.js failed.');
                return callback(false);
            }
            else{
                // console.log('insertFaces success for ' + painting);
                return callback(true);
            }
        });
    };

    var painting = painting_magnitudes[session.magnitudes][session.collection[session.index]];
    var outputPath = PATH_TO_OUTPUTS + session.sessionId + '/' + painting + '.png';
    var swappedHeadsFolder = PATH_TO_SESSIONS + session.sessionId + '/swapped/' + painting + '/';
    var heads = [];

    for(var i=0; i < session.faces.length; i++){
        heads.push(swappedHeadsFolder + i + '.png');
    }

    callFaceInsert(painting, outputPath, heads.join(' '), function(code){
        if(code){
            session.collection[session.index] = { painting: painting, imgUrl: SERVER_URL + '/' + outputPath.substring(outputPath.indexOf('images')) };
            return callback({ success: true, session: session });
        }
        else{
            session.index++;
            return swapFaces(session, callback);
        }
    });
};

var swapFaces = function(session, callback){

    var callFaceSwap = function(pathToHead, pathToFace, headMirror, faceMirror, pathToOutput, callback){

        var c = child.exec(faceSwap + pathToHead + ' ' + pathToFace + ' ' + pathToOutput + ' ' + headMirror + ' ' + faceMirror, function(error, stdout, stderr) {
            if (error) {
                console.log('faceSwap.py error: ' + error);
            }
            if(stderr){
                console.log('faceSwap.py stderr: ' + stderr);
            }
            if(stdout){
                // console.log(stdout);
            }
        });
    
        c.on('exit', function(code){
            if(code !== 0){
                return callback(false);
            }
            else{
                return callback(true);
            }
        });
    };

    if(session.index >= session.collection.length || typeof(session.collection[session.index]) === 'object'){
        return callback({ success: false, session: session });
    }
    
    var painting = painting_magnitudes[session.magnitudes][session.collection[session.index]];
    var inputFolder = PATH_TO_SESSIONS + session.sessionId + '/input/';
    var facesFolder = PATH_TO_PORTRAIT_FACES + painting + '/';
    var outputFolder = PATH_TO_SESSIONS + session.sessionId + '/swapped/' + painting + '/';
    var counter = 0;
    var failure = false;

    fs.mkdir(outputFolder, function(err){
        if(err){
            console.log('mkdir err: ' + err);
            return callback({ success: false, session: session });
        }
        else{
            session.faces.forEach(function(face, i){
                // console.log('\nINPUT: ' + inputFolder + face.image_path + ', ' + face.mirror + '\nFACES: ' + facesFolder + painting_datas[painting].faces[i].image_path + ', ' + painting_datas[painting].faces[i].mirror + '\nOutput: ' + outputFolder + i + '.png');
                callFaceSwap(facesFolder + painting_datas[painting].faces[i].image_path, S3_BUCKET_URL + face.image_path, painting_datas[painting].faces[i].mirror, face.mirror, outputFolder + i + '.png', function(code){
                    counter += 1;
                    if(!code){
                        failure = true;
                    }
                    if(counter === session.faces.length){
                        if(!failure){
                            return insertFaces(session, callback);
                        }
                        else{
                            session.index++;
                            return swapFaces(session, callback);
                        }
                    }
                });
            });
        }
    });
};

router.SERVER_URL = SERVER_URL;
router.faceSwap = swapFaces;
module.exports = router;
