const mysql = require('mysql2')

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'wpr',
  password: 'fit2023',
  database: 'wpr2023',
  port: '3306'
}).promise()

connection.connect((err) => {
  if (err) throw err

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
})

connection.end((err) => {
  if (err) throw err
  console.log('Database connection closed!')
})
