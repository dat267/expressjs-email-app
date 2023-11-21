const mysql = require('mysql2')
const crypto = require('crypto')

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'wpr',
  password: 'fit2023',
  database: 'wpr2023',
  port: '3306'
})

function hashPassword(password) {
  const hash = crypto.createHash('sha256')
  hash.update(password)
  const hashedPassword = hash.digest('hex')
  return hashedPassword
}

// Create User table
const createUserTable = `
        CREATE TABLE IF NOT EXISTS User(
            id INT PRIMARY KEY AUTO_INCREMENT,
            fullName VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            token VARCHAR(255),
            expirationTime DATETIME
        )
    `
connection.query(createUserTable, (err) => {
  if (err) throw err
  console.log('User table created')
})

// Create Email table
const createEmailTable = `
        CREATE TABLE IF NOT EXISTS Email(
            id INT PRIMARY KEY AUTO_INCREMENT,
            senderId INT,
            recipientId INT,
            subject VARCHAR(255),
            body TEXT,
            timeSent DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (senderId) REFERENCES User(id),
            FOREIGN KEY (recipientId) REFERENCES User(id)
        )
    `
connection.query(createEmailTable, (err) => {
  if (err) throw err
  console.log('Email table created')
})

// Create UserEmail table
const createUserEmailTable = `
        CREATE TABLE IF NOT EXISTS UserEmail(
            userId INT,
            emailId INT,
            isDeleted BOOLEAN DEFAULT false,
            PRIMARY KEY(userId, emailId),
            FOREIGN KEY (userId) REFERENCES User(id),
            FOREIGN KEY (emailId) REFERENCES Email(id)
        )
    `
connection.query(createUserEmailTable, (err) => {
  if (err) throw err
  console.log('UserEmail table created')
})

// Create Attachment table
const createAttachmentTable = `
        CREATE TABLE IF NOT EXISTS Attachment(
            id INT PRIMARY KEY AUTO_INCREMENT,
            emailId INT,
            fileName VARCHAR(255),
            fileData BLOB,
            FOREIGN KEY (emailId) REFERENCES Email(id)
        )
    `
connection.query(createAttachmentTable, (err) => {
  if (err) throw err
  console.log('Attachment table created')
})

// Insert Users
const hashedPassword1 = hashPassword('password1')
const hashedPassword2 = hashPassword('password2')
const hashedPassword3 = hashPassword('password3')

const query = `
   INSERT IGNORE INTO User(fullName, email, password)
   VALUES
   ('User 1', 'a@a.com', ?),
   ('User 2', 'b@b.com', ?),
   ('User 3', 'c@c.com', ?)
 `

connection.query(query, [hashedPassword1, hashedPassword2, hashedPassword3], (err) => {
  if (err) throw err
  console.log('Users inserted')
})

const clearEmailTable = `DELETE FROM Email`
connection.query(clearEmailTable, (err) => {
  if (err) throw err
  console.log('Cleared Email table')
})

// Insert Emails
const insertEmails = `
   INSERT IGNORE INTO Email(senderId, recipientId, subject, body)
   VALUES
   (1, 2, 'Hello from User 1', 'This is a message from User 1 to User 2'),
   (1, 3, 'Hello from User 1', 'This is a message from User 1 to User 3'),
   (2, 1, 'Hello from User 2', 'This is a message from User 2 to User 1'),
   (2, 3, 'Hello from User 2', 'This is a message from User 2 to User 3'),
   (3, 1, 'Hello from User 3', 'This is a message from User 3 to User 1'),
   (3, 2, 'Hello from User 3', 'This is a message from User 3 to User 2'),
   (1, 2, 'Another message from User 1', 'This is another message from User 1 to User 2'),
   (2, 1, 'Another message from User 2', 'This is another message from User 2 to User 1')
`
connection.query(insertEmails, (err) => {
  if (err) throw err
  console.log('Emails inserted')
})

// Insert UserEmails
const insertUserEmails = `
   INSERT IGNORE INTO UserEmail(userId, emailId)
   VALUES
   (1, 1), (2, 1),
   (1, 2), (3, 2),
   (2, 3), (1, 3),
   (3, 4), (2, 4),
   (1, 5), (2, 5)
`
connection.query(insertUserEmails, (err) => {
  if (err) throw err
  console.log('UserEmails inserted')
})

connection.end((err) => {
  if (err) throw err
  console.log('Database connection closed!')
})
