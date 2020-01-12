const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://root:root@cluster0-pstwe.mongodb.net/test?retryWrites=true&w=majority', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

