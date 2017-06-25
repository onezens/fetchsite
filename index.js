/**
 * Created by Zhen on 2016/11/27.
 */
const express = require('express');
const path = require('path');
const fs = require('fs');
const fetch = require('./fetch.js');

const app = express();
const port = 3046;

app.use('/public',express.static(path.join(__dirname,'public')));
app.use('/',function(req, res){
    res.send('fetch website');
});
app.listen(port, function(){
    console.log('fetch site start success! listen on port ' + port);
    fetch.fetch();
});


/* 

 递归处理文件,文件夹 

 path 路径 
 floor 层数 
 handleFile 文件,文件夹处理函数 

 */

function walk(path, floor, handleFile) {
    handleFile(path, floor);
    floor++;
    fs.readdir(path, function(err, files) {
        if (err) {
            console.log('read dir error');
        } else {
            files.forEach(function(item) {
                var tmpPath = path + '/' + item;
                fs.stat(tmpPath, function(err1, stats) {
                    if (err1) {
                        console.log('stat error');
                    } else {
                        if (stats.isDirectory()) {
                            walk(tmpPath, floor, handleFile);
                        } else {
                            handleFile(tmpPath, floor);
                        }
                    }
                })
            });

        }
    });
}  
  
