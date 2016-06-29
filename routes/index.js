var express = require('express');
var swapper = require('./swapper');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
	if(req.query.imUrl){
		swapper.getFaceSwap(req.query.imUrl, res);
	}
	else{
		res.json({'success':false});
	}
});

module.exports = router;
