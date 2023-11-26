const mysql = require('mysql2/promise')

const pool = mysql.createPool({
  host: 'localhost',
  user: 'wpr',
  password: 'fit2023',
  database: 'wpr2023',
  port: 3306
})

/**
 * Checks if a user has access to a specific attachment.
 * @param {string} userEmail - The email of the user.
 * @param {string} userToken - The token associated with the user.
 * @param {number} emailId - The ID of the email containing the attachment.
 * @returns {Promise<boolean>} - A Promise that resolves to true if the user has access, and false otherwise.
 */
exports.hasAccessToAttachment = async function (userEmail, userToken, emailId) {
  const query = `
    SELECT
      U1.id AS senderId,
      U1.email AS senderEmail,
      U1.token AS senderToken,
      U2.id AS recipientId,
      U2.email AS recipientEmail,
      U2.token AS recipientToken,
      E.attachmentSavedName AS attachmentSavedName
    FROM Email E
    INNER JOIN User U1 ON E.senderId = U1.id
    INNER JOIN User U2 ON E.recipientId = U2.id
    WHERE E.id = ? AND E.attachmentSavedName IS NOT NULL
  `

  const [result] = await pool.query(query, [emailId])

  if (Array.isArray(result) && result.length > 0) {
    const attachmentInfo = result[0]

    // Check if the user's email and token match either the sender or recipient
    return (
      // @ts-ignore
      (userEmail === attachmentInfo.senderEmail && userToken === attachmentInfo.senderToken) ||
      // @ts-ignore
      (userEmail === attachmentInfo.recipientEmail && userToken === attachmentInfo.recipientToken)
    )
  } else {
    throw new Error('Attachment not found')
  }
}
