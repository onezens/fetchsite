/**
 * Created by Zhen on 2016/11/27.
 */
const express = require('express');
const path = require('path');
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
