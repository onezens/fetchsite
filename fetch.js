/**
 * Created by Zhen on 2016/11/27.
 */

const cheerio = require('cheerio');
const entities = require('entities');
const https = require('https');
const fs = require('fs');
const path = require('path');

var fetchUrl = 'https://npm.taobao.org/mirrors/node/latest/docs/api/';
var fetchName = 'node_docs'; //保存在本地的目录
var urls = []; //初始化

function fetch() {
    console.log('fetch');
    https.get(fetchUrl+'index.html', function(res){
        var data = null;
        res.on('data', function(trunk){
            data += trunk;
        })
        res.on('end', function(){
            console.log(data.toString());
            saveData('./public/'+fetchName, 'index.html', data);
        });
    })
}

function saveData(savePath, saveName, data){
    savePath = path.isAbsolute(savePath) ? savePath : path.join(__dirname, savePath);
    console.log(savePath);
    try {
        fs.statSync(savePath);
    }catch (error){
        fs.mkdirSync(savePath);
    }
    savePath = path.join(savePath, saveName);
    console.log(savePath);
    fs.writeFile(savePath, data, function(err){
        if(err){
            console.log(savePath + "  " + err);
        }else {
            console.log('save success!  ' + savePath);
        }
    });
}



module.exports.fetch = fetch;