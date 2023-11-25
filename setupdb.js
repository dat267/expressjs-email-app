const mysql = require('mysql2/promise')
const crypto = require('crypto')

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'wpr',
  password: 'fit2023',
  database: 'wpr2023',
  port: 3306
})

/**
 * Hashes a given password using the SHA-256 algorithm.
 * @param {string} password - The password to be hashed.
 * @returns {string} - The hashed password in hexadecimal format.
 */
function hashPassword (password) {
  /**
   * The crypto module provides cryptographic functionality, including hash functions.
   * @see {@link https://nodejs.org/api/crypto.html}
   */
  const hash = crypto.createHash('sha256')
  hash.update(password)

  /**
   * The digest method is used to produce the hash output.
   * @param {string} [encoding='hex'] - The encoding of the output. Default is 'hex'.
   * @returns {string} - The hashed password in the specified encoding.
   */
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
  /**
   * SQL statement to create the User table with columns:
   * - id: Auto-incremented primary key
   * - fullName: Not null, full name of the user
   * - email: Unique, not null, email address of the user
   * - password: Not null, hashed password of the user
   * - token: Token associated with the user
   * - expirationTime: Date and time when the token expires
   */
  const createUserTable = `CREATE TABLE IF NOT EXISTS User(
    id INT PRIMARY KEY AUTO_INCREMENT,
    fullName VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    token VARCHAR(255),
    expirationTime DATETIME
  )`

  // Execute the query to create or verify the existence of the User table
  await (await connection).query(createUserTable)
  console.log('User table created')

  /**
   * SQL statement to create the Email table with columns:
   * - id: Auto-incremented primary key
   * - senderId: Foreign key referencing the User table, representing the sender of the email
   * - recipientId: Foreign key referencing the User table, representing the recipient of the email
   * - subject: Subject of the email
   * - body: Body text of the email
   * - timeSent: Date and time when the email was sent (default is the current timestamp)
   * - deletedBySender: Boolean indicating whether the sender deleted the email (default is false)
   * - deletedByRecipient: Boolean indicating whether the receiver deleted the email (default is false)
   */
  const createEmailTable = `CREATE TABLE IF NOT EXISTS Email(
    id INT PRIMARY KEY AUTO_INCREMENT,
    senderId INT,
    recipientId INT,
    subject VARCHAR(255),
    body TEXT,
    timeSent DATETIME DEFAULT CURRENT_TIMESTAMP,
    deletedBySender BOOLEAN DEFAULT FALSE,
    deletedByRecipient BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (senderId) REFERENCES User(id),
    FOREIGN KEY (recipientId) REFERENCES User(id)
  )`

  // Execute the query to create or verify the existence of the Email table
  await (await connection).query(createEmailTable)
  console.log('Email table created')

  /**
   * SQL statement to create the Attachment table with columns:
   * - id: Auto-incremented primary key
   * - emailId: Foreign key referencing the Email table, representing the email to which the attachment belongs
   * - fileName: Name of the attached file
   * - fileData: Binary large object (BLOB) containing the attachment data
   */
  const createAttachmentTable = `CREATE TABLE IF NOT EXISTS Attachment(
    id INT PRIMARY KEY AUTO_INCREMENT,
    emailId INT,
    fileName VARCHAR(255),
    fileData BLOB,
    FOREIGN KEY (emailId) REFERENCES Email(id)
  )`

  // Execute the query to create or verify the existence of the Attachment table
  await (await connection).query(createAttachmentTable)
  console.log('Attachment table created')
}

/**
 * Asynchronously inserts users into the User table with hashed passwords.
 * If a user with the same email already exists, the insertion is ignored.
 * @async
 * @function
 * @returns {Promise<void>} - Resolves when user insertion is completed.
 */
async function insertUsers () {
  // Hash passwords for user insertion
  const hashedPassword1 = hashPassword('password1')
  const hashedPassword2 = hashPassword('password2')
  const hashedPassword3 = hashPassword('password3')

  /**
   * SQL query to insert users into the User table.
   * - The INSERT IGNORE statement prevents duplicate entries based on email.
   * - Columns inserted: fullName, email, password.
   * - Values for three users are provided, each with a unique combination of name, email, and hashed password.
   */
  const query = `INSERT IGNORE INTO User(fullName, email, password)
    VALUES
    ('User 1', 'a@a.com', ?),
    ('User 2', 'b@b.com', ?),
    ('User 3', 'c@c.com', ?)`

  // Execute the query with hashed passwords as parameters
  await (await connection).query(query, [hashedPassword1, hashedPassword2, hashedPassword3])
  console.log('Users inserted')
}

/**
 * Asynchronously clears all entries from the Email table, effectively resetting it.
 * @async
 * @function
 * @returns {Promise<void>} - Resolves when the Email table is cleared.
 */
async function clearEmailTable () {
  /**
   * SQL query to delete all rows from the Email table.
   * This effectively resets the table by removing all email entries.
   */
  const clearEmailTableQuery = 'DELETE FROM Email'

  // Execute the query to clear the Email table
  await (await connection).query(clearEmailTableQuery)
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
  /**
   * SQL query to insert emails into the Email table.
   * - The INSERT IGNORE statement prevents duplicate entries based on sender, recipient, subject, and body.
   * - Columns inserted: senderId, recipientId, subject, body.
   * - Values for eight emails are provided, each with a unique combination of sender, recipient, subject, and body.
   */
  const insertEmailsQuery = `INSERT IGNORE INTO Email(senderId, recipientId, subject, body)
    VALUES
    (1, 2, 'Hello from User 1', 'This is a message from User 1 to User 2'),
    (1, 3, 'Hello from User 1', 'This is a message from User 1 to User 3'),
    (2, 1, 'Hello from User 2', 'This is a message from User 2 to User 1'),
    (2, 3, 'Hello from User 2', 'This is a message from User 2 to User 3'),
    (3, 1, 'Hello from User 3', 'This is a message from User 3 to User 1'),
    (3, 2, 'Hello from User 3', 'This is a message from User 3 to User 2'),
    (1, 2, 'Another message from User 1', 'This is another message from User 1 to User 2'),
    (2, 1, 'Another message from User 2', 'This is another message from User 2 to User 1')`

  // Execute the query to insert emails
  await (await connection).query(insertEmailsQuery)
  console.log('Emails inserted')
}

/**
 * Asynchronously sets up the database by creating tables, inserting users and emails,
 * and performing cleanup operations. Closes the database connection when completed.
 * @async
 * @function
 * @returns {Promise<void>} - Resolves when the database setup is completed and the connection is closed.
 */
async function main () {
  try {
    // Create necessary tables
    await createTables()

    // Insert users into the User table
    await insertUsers()

    // Clear all entries from the Email table
    await clearEmailTable()

    // Insert emails into the Email table
    await insertEmails()

    console.log('Database setup completed!')
  } catch (err) {
    // Handle any errors that occur during database setup
    console.error(err)
  } finally {
    // Close the database connection regardless of success or failure
    await (await connection).end()
    console.log('Database connection closed!')
  }
}

// Execute the main function to set up the database
main()
