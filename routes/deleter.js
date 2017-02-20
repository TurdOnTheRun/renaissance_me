var express = require('express');
var path = require('path');
var child = require('child_process');

var deleteFiles = path.join(__dirname, 'bash_scripts', 'delete-files');
var sessions = path.join(__dirname, '..', 'sessions');
var finalImages = path.join(__dirname, '..', 'public', 'images');

var removeSessionFiles = function(sessionId){
    if(sessionId && sessionId.length > 20){
        console.log(deleteFiles + ' ' + sessions + '/' + sessionId + ' ' + finalImages + '/' + sessionId);
        // var c = child.exec(deleteFiles + ' ' + sessions + '/' + sessionId + ' ' + finalImages + '/' + sessionId);
        // c.on('exit', function(code){
        //     if(code !== 0){
        //         console.log('Failed to delete files for ' + sessionId);
        //         //___ERROR___
        //     }
        // });
    }
};

module.exports = removeSessionFiles;