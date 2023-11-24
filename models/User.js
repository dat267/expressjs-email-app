const crypto = require('crypto');
const mysql = require('mysql2');

const connection = mysql.createPool({
  host: 'localhost',
  user: 'wpr',
  password: 'fit2023',
  database: 'wpr2023',
  port: '3306',
});

function hashPassword(password) {
  const hash = crypto.createHash('sha256');
  hash.update(password);
  const hashedPassword = hash.digest('hex');
  return hashedPassword;
}
function checkPassword(plaintextPassword, hashedPassword) {
  const hashedPlaintextPassword = hashPassword(plaintextPassword);
  return hashedPlaintextPassword === hashedPassword;
}
function checkIfTokenExists(token) {
  const query = 'SELECT * FROM User WHERE token = ?';
  connection.query(query, [token], (err, results) => {
    if (err) throw err;
    return results.length > 0;
  });
}
function generateUniqueAccessToken() {
  let token = crypto.randomBytes(64).toString('hex');
  let exists = checkIfTokenExists(token);

  while (exists) {
    token = crypto.randomBytes(64).toString('hex');
    exists = checkIfTokenExists(token);
  }

  return token;
}
function getExpirationTime(seconds) {
  const unixTimeInSeconds = Math.floor(Date.now() / 1000);
  return unixTimeInSeconds + seconds / 1000;
}

exports.signup = function (fullName, email, password, rePassword, callback) {
  if (!fullName || !email || !password || password !== rePassword) {
    return callback('Invalid form data. Please fill in all fields and ensure passwords match.');
  }
  const checkEmailQuery = 'SELECT * FROM User WHERE email = ?';
  connection.query(checkEmailQuery, [email], (err, result) => {
    if (err) return callback(err);
    if (result.length > 0) {
      return callback('Email address is already in use. Please choose another.');
    }
    const hashedPassword = hashPassword(password);
    const insertUserQuery = 'INSERT INTO User (fullName, email, password) VALUES (?, ?, ?)';
    connection.query(insertUserQuery, [fullName, email, hashedPassword], (err) => {
      if (err) return callback(err);
      callback(null, 'User created successfully. You can now <a href="/">sign in</a>.');
    });
  });
};

exports.signin = function (email, password, callback) {
  const query = 'SELECT * FROM User WHERE email = ?';
  connection.query(query, [email], (err, results) => {
    if (err) callback(err);
    else {
      const user = results[0];
      if (user && checkPassword(password, user.password)) {
        const accessToken = generateUniqueAccessToken();
        const expirationTime = getExpirationTime(60 * 60 * 24);
        const updateTokenQuery = 'UPDATE User SET token = ?, expirationTime = FROM_UNIXTIME(?) WHERE id = ?';
        user.accessToken = accessToken;
        user.expirationTime = expirationTime;
        connection.query(updateTokenQuery, [accessToken, expirationTime, user.id], (err) => {
          if (err) callback(err);
          else callback(null, user);
        });
      } else {
        callback(new Error('Invalid email or password'));
      }
    }
  });
};

exports.authenticate = function (email, token, callback) {
  try {
    const query = 'SELECT * FROM User WHERE email = ? AND expirationTime > NOW()';
    connection.query(query, [email], (err, results) => {
      if (err) return callback(err, null);
      if (results.length > 0 && results[0].token === token) {
        const userObject = results[0];
        return callback(null, userObject);
      } else {
        return callback(null, null);
      }
    });
  } catch (error) {
    console.error(error);
    return callback(error);
  }
};

exports.findUserByEmail = function (email, callback) {
  const query = 'SELECT * FROM User WHERE email = ?';
  connection.query(query, [email], (err, results) => {
    if (err) {
      return callback(err, null);
    } else {
      const userObject = results.length > 0 ? results[0] : null;
      return callback(null, userObject);
    }
  });
};
