const fsPromises = require('fs/promises')
const path = require('path')
const { pool } = require('./Pool')

exports.Email = class {
  /**
   * Retrieves an email from the Email table based on the provided email ID.
   * @param {number} emailId - The unique identifier of the email to retrieve.
   * @returns {Promise<?object>} - Resolves with the retrieved email object or null if not found.
   */
  static async getEmailById (emailId) {
    const query = 'SELECT * FROM Email WHERE id = ?'
    const [results] = await pool.query(query, [emailId])

    if (Array.isArray(results)) {
      const enhancedEmails = await enhanceEmails(results)
      return enhancedEmails[0]
    } else {
      return null
    }
  }

  /**
   * Retrieves emails from the database based on the recipient's ID, excluding those marked as deleted by the recipient.
   * @param {number} recipientId - The ID of the recipient for whom emails are to be retrieved.
   * @returns {Promise<object[]>} - A Promise that resolves to an array of objects representing the emails found in the database for the specified recipient.
   */
  static async getEmailsByRecipientId (recipientId) {
    const query = 'SELECT * FROM Email WHERE recipientId = ? AND deletedByRecipient = FALSE'
    const [results] = await pool.query(query, [recipientId])

    if (Array.isArray(results)) {
      const enhancedEmails = await enhanceEmails(results)
      return enhancedEmails
    } else {
      return []
    }
  }

  /**
   * Retrieves emails from the database based on the sender's ID, excluding those marked as deleted by the sender.
   * @param {number} senderId - The ID of the sender for whom emails are to be retrieved.
   * @returns {Promise<object[]>} - A Promise that resolves to an array of objects representing the emails found in the database for the specified sender.
   */
  static async getEmailsBySenderId (senderId) {
    const query = 'SELECT * FROM Email WHERE senderId = ? AND deletedBySender = FALSE'
    const [results] = await pool.query(query, [senderId])

    if (Array.isArray(results)) {
      const enhancedEmails = await enhanceEmails(results)
      return enhancedEmails
    } else {
      return []
    }
  }

  /**
   * Retrieves a received email from the database based on the email ID and recipient's ID.
   * @param {number} emailId - The ID of the email to be retrieved.
   * @param {number} recipientId - The ID of the recipient for whom the email is intended.
   * @returns {Promise<object|null>} - A Promise that resolves to an object representing the received email found in the database, or null if the email is not found for the specified recipient.
   */
  static async getReceivedEmailById (emailId, recipientId) {
    const query = 'SELECT * FROM Email WHERE id = ? AND recipientId = ?'
    const [results] = await pool.query(query, [emailId, recipientId])

    if (Array.isArray(results)) {
      const enhancedEmails = await enhanceEmails(results)
      return enhancedEmails.length > 0 ? enhancedEmails[0] : null
    } else {
      return null
    }
  }

  /**
   * Retrieves a sent email from the database based on the email ID and sender's ID.
   * @param {number} emailId - The ID of the email to be retrieved.
   * @param {number} senderId - The ID of the sender who sent the email.
   * @returns {Promise<object|null>} - A Promise that resolves to an object representing the sent email found in the database, or null if the email is not found for the specified sender.
   */
  static async getSentEmailById (emailId, senderId) {
    const query = 'SELECT * FROM Email WHERE id = ? AND senderId = ?'
    const [results] = await pool.query(query, [emailId, senderId])

    if (Array.isArray(results)) {
      const enhancedEmails = await enhanceEmails(results)
      return enhancedEmails.length > 0 ? enhancedEmails[0] : null
    } else {
      return null
    }
  }

  /**
   * Creates a new email in the database.
   * @param {number} senderId - The ID of the sender.
   * @param {number} recipientId - The ID of the recipient.
   * @param {string} subject - The subject of the email.
   * @param {string} body - The body of the email.
   * @param {string|null} attachmentOriginalName - The file path of the atta
   * @param {string|null} attachmentSavedName - The file path of the attachment.chment.
   * @returns {Promise<number>} - A Promise that resolves to the ID of the newly created email.
   */
  static async createEmail (senderId, recipientId, subject, body, attachmentOriginalName, attachmentSavedName) {
    const timeSent = new Date().toISOString().slice(0, 19).replace('T', ' ') // Current timestamp

    let query, values

    if (attachmentSavedName) {
      // If there is an attachment, include the attachment file path in the query
      query = `
        INSERT INTO Email (senderId, recipientId, subject, body, timeSent, attachmentOriginalName, attachmentSavedName)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `
      values = [senderId, recipientId, subject, body, timeSent, attachmentOriginalName, attachmentSavedName]
    } else {
      // If no attachment, use the original query without the attachment file path
      query = `
        INSERT INTO Email (senderId, recipientId, subject, body, timeSent)
        VALUES (?, ?, ?, ?, ?)
      `
      values = [senderId, recipientId, subject, body, timeSent]
    }

    const [result] = await pool.query(query, values)

    if ('insertId' in result) {
      return result.insertId
    } else {
      throw new Error('Failed to create email.')
    }
  }

  /**
   * Marks an email as deleted by the sender in the database.
   * If both deletedBySender and deletedByRecipient are true, the entire row is deleted.
   * Also deletes the attachment file from the /uploads folder.
   * @param {number} emailId - The ID of the email to be marked as deleted.
   * @param {number} senderId - The ID of the sender.
   * @returns {Promise<void>} - A Promise that resolves when the email is marked as deleted by the sender.
   */
  static async deleteEmailForSender (emailId, senderId) {
    const selectQuery = 'SELECT attachmentSavedName FROM Email WHERE id = ? AND senderId = ?'
    const updateQuery = 'UPDATE Email SET deletedBySender = TRUE WHERE id = ? AND senderId = ?'
    const deleteQuery = 'DELETE FROM Email WHERE id = ? AND deletedByRecipient = TRUE'

    const [emailInfo] = await pool.query(selectQuery, [emailId, senderId])

    if (Array.isArray(emailInfo) && !emailInfo.length) {
      throw new Error('Email not found or unauthorized to delete.')
    }

    await pool.query(updateQuery, [emailId, senderId])

    // Check if both flags are true and delete the row if needed
    const [updateResult] = await pool.query(deleteQuery, [emailId])

    if ('affectedRows' in updateResult && updateResult.affectedRows > 0) {
      // Delete attachment file
      await this.deleteAttachment(emailInfo[0].attachmentSavedName)
    }
  }

  /**
   * Marks an email as deleted by the recipient in the database.
   * If both deletedBySender and deletedByRecipient are true, the entire row is deleted.
   * Also deletes the attachment file from the /uploads folder.
   * @param {number} emailId - The ID of the email to be marked as deleted.
   * @param {number} recipientId - The ID of the recipient.
   * @returns {Promise<void>} - A Promise that resolves when the email is marked as deleted by the recipient.
   */
  static async deleteEmailForRecipient (emailId, recipientId) {
    const selectQuery = 'SELECT attachmentSavedName FROM Email WHERE id = ? AND recipientId = ?'
    const updateQuery = 'UPDATE Email SET deletedByRecipient = TRUE WHERE id = ? AND recipientId = ?'
    const deleteQuery = 'DELETE FROM Email WHERE id = ? AND deletedBySender = TRUE'

    const [emailInfo] = await pool.query(selectQuery, [emailId, recipientId])

    if (Array.isArray(emailInfo) && !emailInfo.length) {
      throw new Error('Email not found or unauthorized to delete.')
    }

    await pool.query(updateQuery, [emailId, recipientId])

    // Check if both flags are true and delete the row if needed
    const [updateResult] = await pool.query(deleteQuery, [emailId])

    if ('affectedRows' in updateResult && updateResult.affectedRows > 0) {
      // Delete attachment file
      await this.deleteAttachment(emailInfo[0].attachmentSavedName)
    }
  }

  /**
   * Deletes the attachment file associated with the given file name from the /uploads folder.
   * @param {string} attachmentSavedName - The saved file name of the attachment.
   * @returns {Promise<void>} - A Promise that resolves when the attachment file is deleted.
   */
  static async deleteAttachment (attachmentSavedName) {
    if (attachmentSavedName) {
      const filePath = path.join(__dirname, '..', 'uploads', attachmentSavedName)
      await fsPromises.unlink(filePath)
    }
  }
}

/**
 * Enhances an array of emails by joining the User table to include sender's and recipient's full names and emails.
 * @param {Array} emails - An array of email objects.
 * @returns {Promise<object[]>} - A Promise that resolves to an array of enhanced email objects with additional information about sender's and recipient's full names and emails.
 */
async function enhanceEmails (emails) {
  if (emails.length === 0) {
    return emails
  }

  // Extract unique sender and recipient IDs from the emails
  const userIds = new Set([
    ...emails.map((email) => email.senderId),
    ...emails.map((email) => email.recipientId)
  ])

  // Fetch user information for the unique IDs
  const usersQuery = 'SELECT id, fullName, email FROM User WHERE id IN (?)'
  const [users] = await pool.query(usersQuery, [Array.from(userIds)])

  // Create a user map for easy lookup
  // @ts-ignore
  const userMap = new Map(users.map((user) => [user.id, user]))

  // Enhance each email with sender's and recipient's information
  const enhancedEmails = emails.map((email) => {
    const senderInfo = userMap.get(email.senderId) || {}
    const recipientInfo = userMap.get(email.recipientId) || {}
    return {
      ...email,
      senderFullName: senderInfo.fullName,
      senderEmail: senderInfo.email,
      recipientFullName: recipientInfo.fullName,
      recipientEmail: recipientInfo.email
    }
  })
  return enhancedEmails
}
