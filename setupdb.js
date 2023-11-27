const crypto = require('crypto')
const { pool } = require('./middleware/Pool')

/**
 * Hashes a given password using the SHA-256 algorithm.
 * @param {string} password - The password to be hashed.
 * @returns {string} - The hashed password in hexadecimal format.
 */
function hashPassword (password) {
  const hash = crypto.createHash('sha256')
  hash.update(password)
  const hashedPassword = hash.digest('hex')
  return hashedPassword
}

/**
 * Asynchronously creates necessary tables for the application in the connected database.
 * If the tables already exist, it ensures that they are not re-created.
 * @async
 * @function
 * @returns {Promise<void>} - Resolves when all tables are created or verified to exist.
 */
async function createTables () {
  const createUserTable = `CREATE TABLE IF NOT EXISTS User(
    id INT PRIMARY KEY AUTO_INCREMENT,
    fullName VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    token VARCHAR(255),
    expirationTime DATETIME
  )`

  // Execute the query to create or verify the existence of the User table
  await (await pool).query(createUserTable)
  console.log('User table created')

  const createEmailTable = `CREATE TABLE IF NOT EXISTS Email(
  id INT PRIMARY KEY AUTO_INCREMENT,
  senderId INT,
  recipientId INT,
  subject VARCHAR(255),
  body TEXT,
  attachmentOriginalName VARCHAR(255) DEFAULT NULL,
  attachmentSavedName VARCHAR(255) DEFAULT NULL,
  timeSent DATETIME DEFAULT CURRENT_TIMESTAMP,
  deletedBySender BOOLEAN DEFAULT FALSE,
  deletedByRecipient BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (senderId) REFERENCES User(id),
  FOREIGN KEY (recipientId) REFERENCES User(id)
  )`

  // Execute the query to create or verify the existence of the Email table
  await (await pool).query(createEmailTable)
  console.log('Email table created')
}

/**
 * Asynchronously inserts users into the User table with hashed passwords.
 * If a user with the same email already exists, the insertion is ignored.
 * @async
 * @function
 * @returns {Promise<void>} - Resolves when user insertion is completed.
 */
async function insertUsers () {
  const hashedPassword1 = hashPassword('password1');
  const hashedPassword2 = hashPassword('password2');
  const hashedPassword3 = hashPassword('password3');
  const hashedPassword4 = hashPassword('password4');
  const hashedPassword5 = hashPassword('password5');

  const query = `INSERT IGNORE INTO User(fullName, email, password)
    VALUES
    ('User 1', 'a@a.com', ?),
    ('User 2', 'b@b.com', ?),
    ('User 3', 'c@c.com', ?),
    ('User 4', 'd@d.com', ?),
    ('User 5', 'e@e.com', ?)`;

  await (await pool).query(query, [
    hashedPassword1,
    hashedPassword2,
    hashedPassword3,
    hashedPassword4,
    hashedPassword5,
  ]);
  console.log('Users inserted');
}

/**
 * Asynchronously clears all entries from the Email table, effectively resetting it.
 * @async
 * @function
 * @returns {Promise<void>} - Resolves when the Email table is cleared.
 */
async function clearEmailTable () {
  const clearEmailTableQuery = 'DELETE FROM Email'
  await (await pool).query(clearEmailTableQuery)
  console.log('Cleared Email table')
}

/**
 * Asynchronously inserts emails into the Email table.
 * If an email with the same sender, recipient, subject, and body already exists, the insertion is ignored.
 * @async
 * @function
 * @returns {Promise<void>} - Resolves when email insertion is completed.
 */
async function insertEmails () {
  const insertEmailsQuery = `
    INSERT IGNORE INTO Email(senderId, recipientId, subject, body)
    VALUES
    (1, 2, 'Email from User 1', 'This is a message from User 1 (a@a.com) to User 2 (b@b.com)'),
    (1, 3, 'Email from User 1', 'This is a message from User 1 (a@a.com) to User 3 (c@c.com)'),
    (2, 1, 'Email from User 2', 'This is a message from User 2 (b@b.com) to User 1 (a@a.com)'),
    (2, 3, 'Email from User 2', 'This is a message from User 2 (b@b.com) to User 3 (c@c.com)'),
    (3, 1, 'Email from User 3', 'This is a message from User 3 (c@c.com) to User 1 (a@a.com)'),
    (3, 2, 'Email from User 3', 'This is a message from User 3 (c@c.com) to User 2 (b@b.com)'),
    (1, 2, 'Email from User 1', 'This is a message from User 1 (a@a.com) to User 2 (b@b.com)'),
    (2, 1, 'Email from User 2', 'This is a message from User 2 (b@b.com) to User 1 (a@a.com)'),
    (4, 5, 'Email from User 4', 'This is a message from User 4 (d@d.com) to User 5 (e@e.com)'),
    (5, 4, 'Email from User 5', 'This is a message from User 5 (e@e.com) to User 4 (d@d.com)'),
    (1, 3, 'Email from User 1', 'This is a message from User 1 (a@a.com) to User 3 (c@c.com)'),
    (2, 1, 'Email from User 2', 'This is a message from User 2 (b@b.com) to User 1 (a@a.com)'),
    (3, 2, 'Email from User 3', 'This is a message from User 3 (c@c.com) to User 2 (b@b.com)'),
    (4, 5, 'Email from User 4', 'This is a message from User 4 (d@d.com) to User 5 (e@e.com)'),
    (5, 4, 'Email from User 5', 'This is a message from User 5 (e@e.com) to User 4 (d@d.com)'),
    (1, 4, 'Email from User 1', 'This is a message from User 1 (a@a.com) to User 4 (d@d.com)'),
    (2, 5, 'Email from User 2', 'This is a message from User 2 (b@b.com) to User 5 (e@e.com)'),
    (3, 4, 'Email from User 3', 'This is a message from User 3 (c@c.com) to User 4 (d@d.com)'),
    (4, 1, 'Email from User 4', 'This is a message from User 4 (d@d.com) to User 1 (a@a.com)'),
    (5, 2, 'Email from User 5', 'This is a message from User 5 (e@e.com) to User 2 (b@b.com)'),
    (1, 5, 'Email from User 1', 'This is a message from User 1 (a@a.com) to User 5 (e@e.com)'),
    (2, 4, 'Email from User 2', 'This is a message from User 2 (b@b.com) to User 4 (d@d.com)'),
    (3, 5, 'Email from User 3', 'This is a message from User 3 (c@c.com) to User 5 (e@e.com)'),
    (4, 2, 'Email from User 4', 'This is a message from User 4 (d@d.com) to User 2 (b@b.com)'),
    (5, 3, 'Email from User 5', 'This is a message from User 5 (e@e.com) to User 3 (c@c.com)')`;

  await (await pool).query(insertEmailsQuery);
  console.log('Emails inserted');
}


/**
 * Asynchronously sets up the database by creating tables, inserting users and emails,
 * and performing cleanup operations. Closes the database pool when completed.
 * @async
 * @function
 * @returns {Promise<void>} - Resolves when the database setup is completed and the pool is closed.
 */
async function main () {
  try {
    await createTables()
    await insertUsers()
    // await clearEmailTable()
    await insertEmails()

    console.log('Database setup completed!')
  } catch (err) {
    console.error(err)
  } finally {
    await (await pool).end()
    console.log('Database connection closed!')
  }
}

main()
