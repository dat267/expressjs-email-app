const mysql = require('mysql2');

const connection = mysql.createPool({
  host: 'localhost',
  user: 'wpr',
  password: 'fit2023',
  database: 'wpr2023',
  port: '3306',
});

exports.getEmailsByRecipientId = function (recipientId, callback) {
  const query = 'SELECT * FROM Email WHERE recipientId = ? AND deleted_by_receiver = FALSE';
  connection.query(query, [recipientId], (err, results) => {
    if (err) {
      return callback(err, null);
    } else {
      const emails = results;
      return callback(null, emails);
    }
  });
};

exports.getEmailsBySenderId = function (senderId, callback) {
  const query = 'SELECT * FROM Email WHERE senderId = ? AND deleted_by_sender = FALSE';
  connection.query(query, [senderId], (err, results) => {
    if (err) {
      return callback(err, null);
    } else {
      const emails = results;
      return callback(null, emails);
    }
  });
};
