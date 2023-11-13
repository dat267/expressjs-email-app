const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'wpr',
    password: 'fit2023',
    database: 'wpr2023',
    port: '3306'
});

connection.connect(err => {
    if (err) throw err;
    console.log('Connected!');

});
