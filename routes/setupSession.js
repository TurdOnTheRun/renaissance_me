var express = require('express');
var fs = require( 'fs' );
var child = require('child_process');
var path = require('path');
var Shuffle = require('shuffle');

var router = express.Router();
var singleFaceExtractor = 'python ' + path.join(__dirname, '../python', 'dlibSingleFaceExtractor.py ');
var swapper = require('./swapper');

var painting_magnitudes = JSON.parse(fs.readFileSync('magnitudes.json', 'utf8'));

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
				return setupSession(result.session, res);
			}
			else{
				// console.log(result.msg);
				return res.json(result);
			}
		}
	});

	c.on('exit', function (code){
		if(code === 1){
			res.json({'success': false, 'msg': 'ERROR_FACE_EXTRACTOR', 'error': 0});
		}
	});
};

router.start = getFaces;
module.exports = router;

// ERRORS:
// 0: Wrong piping or error in execution
// 1: No Faces in input
// 2: No paintings match magnitudes