var express = require('express');
var fs = require( 'fs' );
var path = require('path');
var child = require('child_process');
var Shuffle = require('shuffle');

var router = express.Router();
var singleFaceExtractor = 'python ' + path.join(__dirname, '../python', 'dlibSingleFaceExtractor.py ');
var faceSwap = 'python ' + path.join(__dirname, '../python', 'faceSwap.py ');
var faceInsert = 'python ' + path.join(__dirname, '../python', 'insertSwapedFaces.py ');

var PATH_TO_PORTRAIT_FACES = path.join(__dirname, '..', '/faces/');
var PATH_TO_SESSIONS = path.join(__dirname, '..', '/sessions/');
var PATH_TO_OUTPUTS = path.join(__dirname, '..', '/public/images/');

var painting_magnitudes = JSON.parse(fs.readFileSync('magnitudes.json', 'utf8'));
var painting_datas = JSON.parse(fs.readFileSync('faceDatabase.json', 'utf8'));

//webfile database
var mongo = require('mongodb');
var monk = require('monk');
var db = monk('localhost:27017/renaissanceme');
var database_sessions = db.get('sessions');
var database_errors = db.get('errors');

var insertFaces = function(session, painting, index, callback){

	var callFaceInsert = function(paintingId, pathToOutput, pathsToSwappedHeads, callback){

		var c = child.exec(faceInsert + paintingId + ' ' + pathToOutput + ' ' + pathsToSwappedHeads, function(error, stdout, stderr) {
			if (error) {
				database_errors.insert({'session_id': session.session_id, 'msg': 'insertFaces.py failed.', 'error': error, 'error_id': 'INSERT'}, function(err, doc){
					if (err){
						//___ERROR___
						console.log('\n\nWARNING: ERROR MESSAGES ARE FAILING!\n\n' + JSON.stringify(err));
					}
				});
		    	//___ERROR___
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

	var outputPath = PATH_TO_OUTPUTS + session.session_id + '/' + painting + '.png';
	var swappedHeadsFolder = PATH_TO_SESSIONS + session.session_id + '/swapped/' + painting + '/';
	var heads = [];

	for(var i=0; i < session.faces.length; i++){
		heads.push(swappedHeadsFolder + i + '.png');
	}

	callFaceInsert(painting, outputPath, heads.join(' '), function(code){
		if(code){
			return callback(index, painting, outputPath);
		}
		else{
			return callback(index, painting, false);
		}
	});
};

var swapFaces = function(session, painting, index, callback){

	var callFaceSwap = function(pathToHead, pathToFace, headMirror, faceMirror, pathToOutput, callback){

		var c = child.exec(faceSwap + pathToHead + ' ' + pathToFace + ' ' + pathToOutput + ' ' + headMirror + ' ' + faceMirror, function(error, stdout, stderr) {
			if (error) {
				database_errors.insert({'session_id': session.session_id, 'msg': 'faceSwap.py failed', 'error': error, 'error_id': 'SWAP'}, function(err, doc){
					if (err){
						//___ERROR___
						console.log('\n\nWARNING: ERROR MESSAGES ARE FAILING!\n\n' + JSON.stringify(err));
					}
				});
			}
			if(stderr){
				console.log('faceSwap.py stderr: ' + stderr);
			}
			if(stdout){
				// console.log(stdout);
			}
		});
	
		c.on('exit', function (code){
			if(code !== 0){
				return callback(false);
			}
			else{
				return callback(true);
			}
		});
	};

	var counter = 0;
	var inputFolder = PATH_TO_SESSIONS + session.session_id + '/input/';
	var facesFolder = PATH_TO_PORTRAIT_FACES + painting + '/';
	var outputFolder = PATH_TO_SESSIONS + session.session_id + '/swapped/' + painting + '/';
	var failure = false;
	fs.mkdir(outputFolder, function(err){
		if(err){
			database_errors.insert({'session_id': session.session_id, 'msg': 'Mkdir failed.', 'error': err, 'error_id': 'MKDIR'}, function(err, doc){
				if (err){
					//___ERROR___
					// throw err;
					console.log('\n\nWARNING: ERROR MESSAGES ARE FAILING!\n\n' + JSON.stringify(err));
				}
			});
			return callback(index, painting, false);
		}
		else{
			session.faces.forEach(function(face, i){
				// console.log('\nINPUT: ' + inputFolder + face.image_path + ', ' + face.mirror + '\nFACES: ' + facesFolder + painting_datas[painting].faces[i].image_path + ', ' + painting_datas[painting].faces[i].mirror + '\nOutput: ' + outputFolder + i + '.png');
				callFaceSwap(facesFolder + painting_datas[painting].faces[i].image_path, inputFolder + face.image_path, painting_datas[painting].faces[i].mirror, face.mirror, outputFolder + i + '.png', function(code){
					counter += 1;
					if(!code){
						failure = true;
					}
					if(counter === session.faces.length){
						if(!failure){
							return insertFaces(session, painting, index, callback);
						}
						else{
							return callback(index, painting, false);
						}
					}
				});
			});
		}
	});
};

//Needs to be implemented
var setupSession = function(result, res){
	// result = {success, magnitudes, session_id, face_count, faces}	
	// console.log(result.magnitudes);

	var swapFacesCallback = function(index, paint, imUrl){
		if(imUrl){
			result.collection[index] = {'success': true, 'painting': paint, 'imUrl': imUrl};
		}
		else{
			result.collection[index] = {'success': false, 'painting': paint};
		}
		finished_paintings += 1;
		if(finished_paintings == expected_paintings){
			database_sessions.insert(result, function(err, doc){
				if (err){
					//___ERROR___
					console.log('\n\nWARNING: SESSIONS DATABASE IS FAILING!\n\n' + JSON.stringify(err));
				}
			});
			return res.json(result);
		}
	};

	var paintings = painting_magnitudes[result.magnitudes];

	if(!paintings){
		return res.json({'success':false, 'msg':'NO_PAINTINGS_W_MAG', 'mag': result.magnitudes, 'error': 2});
	}

	var deck = Array.apply(null, {length: paintings.length}).map(Number.call, Number);
	deck = Shuffle.shuffle({deck: deck});
	result.collection = deck.cards;
	result.collection_index = 0;
	result.done = false;

	var finished_paintings = 0;
	var expected_paintings = 5;

	for(var i=0; i < 5 && i < paintings.length; i++){
		if(i == paintings.length - 1){
			result.done = true;
			expected_paintings = paintings.length;
		}
		var painting = paintings[result.collection[i]];
		swapFaces(result, painting, i, swapFacesCallback);
	}
};

var getFaces = function(imagePath, res){
	// console.log('Extracting Faces for: ' + imagePath + '\n');
	
	var c = child.exec(singleFaceExtractor + '\"' + imagePath + '\"', function(error, stdout, stderr) {
		if (error) {
			database_errors.insert({'msg': 'faceExtractor.py failed', 'error': error, 'error_id': 'EXTRACT'}, function(err, doc){
				if (err){
					//___ERROR___
					console.log('\n\nWARNING: ERROR MESSAGES ARE FAILING!\n\n' + JSON.stringify(err));
				}
			});
	    	//___ERROR___
		}
		if(stderr){
			console.log('faceExtractor.py stderr: ' + stderr);
		}
		if(stdout){
			var result = JSON.parse(stdout);
			if(result.success){
				// console.log(JSON.stringify(result));
				return setupSession(result, res);
			}
			else{
				// console.log(result.msg);
				return res.json(result);
			}
		}
	});

	c.on('exit', function (code){
		if(code === 1){
			// return res.json({'success': false, 'msg': 'ERROR_FACE_EXTRACTOR', 'error': 0});
		}
	});
};

router.getFaceSwap = getFaces;
module.exports = router;

// ERRORS:
// 0: Wrong piping or error in execution
// 1: No Faces in input
// 2: No paintings match magnitudes