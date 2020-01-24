const MongoClient = require('mongodb').MongoClient;

const uri = "mongodb+srv://root:root@cluster0-pstwe.mongodb.net/test?retryWrites=true&w=majority";

MongoClient.connect(uri,(err, client) => {
    if(err){
        console.log(err);
        throw err;
    }
    console.log('Connected...');
});