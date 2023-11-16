const mysql = require('mysql2')

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'wpr',
  password: 'fit2023',
  database: 'wpr2023',
  port: '3306'
})


// Create User table
const createUserTable = `
        CREATE TABLE IF NOT EXISTS User(
            id INT PRIMARY KEY AUTO_INCREMENT,
            fullName VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL
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
const insertUsers = `
    INSERT IGNORE INTO User(fullName, email, password)
    VALUES
    ('User 1', 'a@a.com', 'password1'),
    ('User 2', 'b@b.com', 'password2'),
    ('User 3', 'c@c.com', 'password3')
`
connection.query(insertUsers, (err) => {
  if (err) throw err
  console.log('Users inserted')
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

connection.end((err) => {
  if (err) throw err
  console.log('Database connection closed!')
})
