const mysql = require('mysql2/promise')

const pool = mysql.createPool({
  host: 'localhost',
  user: 'wpr',
  password: 'fit2023',
  database: 'wpr2023',
  port: 3306
})

exports.Attachment = class {
  /**
   * Retrieves information about the sender and recipient of an attachment.
   * @param {number} attachmentId - The ID of the attachment.
   * @returns {Promise<object|null>} - A Promise that resolves to an object representing information about the sender and recipient, or null if the attachment is not found.
   */
  static async getAttachmentInfo (attachmentId) {
    const query = `
    SELECT
      A.id AS attachmentId,
      E.id AS emailId,
      E.subject,
      E.body,
      E.timeSent,
      U1.id AS senderId,
      U1.email AS senderEmail,
      U1.token AS senderToken,
      U2.id AS recipientId,
      U2.email AS recipientEmail,
      U2.token AS recipientToken
    FROM Attachment A
    INNER JOIN Email E ON A.emailId = E.id
    INNER JOIN User U1 ON E.senderId = U1.id
    INNER JOIN User U2 ON E.recipientId = U2.id
    WHERE A.id = ?
  `

    const [result] = await pool.query(query, [attachmentId])

    if (Array.isArray(result) && result.length > 0) {
      return result[0]
    } else {
      return null
    }
  }

  /**
   * Checks if a user has access to a specific attachment.
   * @param {string} userEmail - The email of the user.
   * @param {string} userToken - The token associated with the user.
   * @param {number} attachmentId - The ID of the attachment.
   * @returns {Promise<boolean>} - A Promise that resolves to true if the user has access, and false otherwise.
   */
  static async hasAccessToAttachment (userEmail, userToken, attachmentId) {
    const attachmentInfo = await this.getAttachmentInfo(attachmentId)

    if (!attachmentInfo) {
      throw new Error('Attachment not found')
    }

    // Check if the user's email and token match either the sender or recipient
    return (
      (userEmail === attachmentInfo.senderEmail && userToken === attachmentInfo.senderToken) ||
      (userEmail === attachmentInfo.recipientEmail && userToken === attachmentInfo.recipientToken)
    )
  }
}
