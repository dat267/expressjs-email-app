const express = require('express')
const cookieParser = require('cookie-parser')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const fsPromises = require('fs/promises')
const { Email } = require('./db/Email')
const { User } = require('./db/User')
const { hasAccessToAttachment } = require('./db/Attachment')

const app = express()
const upload = multer({ dest: 'uploads/' })

app.use(express.static('public'))

app.set('view engine', 'ejs')

/* Middleware */
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

/* Functions */

/* Constants */
const ITEMS_PER_PAGE = 5

/* Sign in */
app.get('/', async (req, res) => {
  const email = req.cookies.email
  const token = req.cookies.token
  try {
    const user = await User.authenticate(email, token)
    if (user) {
      res.redirect('/inbox')
    } else {
      res.render('layout', { title: 'Sign in', main: 'signin' })
    }
  } catch (err) {
    res.render('layout', { title: 'Sign in', main: 'signin' })
  }
})

app.post('/', async (req, res) => {
  const { email, password } = req.body
  const oneDay = 60 * 60 * 24 * 1000
  try {
    const user = await User.signin(email, password)
    res.cookie('email', user.email, { secure: true, httpOnly: true, maxAge: oneDay })
    res.cookie('fullName', user.fullName, { secure: true, httpOnly: true, maxAge: oneDay })
    res.cookie('token', user.token, { secure: true, httpOnly: true, maxAge: oneDay })
    res.redirect('/inbox')
  } catch (err) {
    const errMessages = []
    if (Array.isArray(err)) {
      for (const e of err) {
        errMessages.push(e.message)
      }
    } else {
      errMessages.push(err.message)
    }
    res.render('layout', { title: 'Sign in', main: 'signin', errMessages, email, password })
    // res.status(400).render('layout', { title: '400 - bad request', main: '400', err })
  }
})

/* Sign up */
app.get('/signup', (req, res) => {
  res.render('layout', { title: 'Sign up', main: 'signup' })
})
app.post('/signup', async (req, res) => {
  const { fullName, email, password, rePassword } = req.body
  try {
    const user = await User.signup(fullName, email, password, rePassword)
    res.render('layout', { title: 'Welcome', main: 'welcome', user })
  } catch (err) {
    const errMessages = []
    if (Array.isArray(err)) {
      for (const e of err) {
        errMessages.push(e.message)
      }
    } else {
      errMessages.push(err.message)
    }
    res.render('layout', { title: 'Sign up', main: 'signup', errMessages, fullName, email, password, rePassword })
    // res.status(400).render('layout', { title: '400 - bad request', main: '400', err })
  }
})

/* Sign out */
app.get('/signout', (req, res) => {
  res.clearCookie('email')
  res.clearCookie('fullName')
  res.clearCookie('token')
  res.redirect('/')
})

/* Inbox */
app.get('/inbox', (req, res) => {
  // Redirect to the first page
  res.redirect('/inbox/1')
})
app.get('/inbox/:page', async (req, res) => {
  const email = req.cookies.email
  const token = req.cookies.token

  try {
    const user = await User.authenticate(email, token)
    const page = parseInt(req.params.page, 10) || 1 // Get the page number from the URL parameter

    const startIndex = (page - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE

    const receivedEmails = await Email.getEmailsByRecipientId(user.id)

    // Sort the emails by timeSent in descending order (latest first)
    const sortedEmails = receivedEmails.sort((a, b) => {
      const dateA = new Date(a.timeSent)
      const dateB = new Date(b.timeSent)
      return dateB.getTime() - dateA.getTime()
    })

    // Extract only the emails for the current page
    const paginatedEmails = sortedEmails.slice(startIndex, endIndex)

    res.render('layout', { title: 'Inbox', main: 'inbox', user, receivedEmails: paginatedEmails, currentPage: page, totalPages: Math.ceil(receivedEmails.length / ITEMS_PER_PAGE) })
  } catch (err) {
    console.error(err)
    res.status(403).render('layout', { title: '403 - access denied', main: '403', err })
    // res.redirect('/');
  }
})

app.get('/inbox/email/:id', async (req, res) => {
  const userEmail = req.cookies.email
  const token = req.cookies.token
  const emailId = Number(req.params.id)
  try {
    const user = await User.authenticate(userEmail, token)
    const email = await Email.getReceivedEmailById(emailId, user.id)
    if (email) {
      res.render('layout', { title: 'Email', main: 'email', user, email })
    } else {
      res.status(404).render('layout', { title: '404 - email not found', main: '404', user, notFound: 'email' })
    }
  } catch (err) {
    console.error(err)
    res.status(403).render('layout', { title: '403 - access denied', main: '403', err })
    // res.redirect('/')
  }
})

/* Outbox */
app.get('/outbox', (req, res) => {
  // Redirect to the first page
  res.redirect('/outbox/1')
})
app.get('/outbox/:page', async (req, res) => {
  const email = req.cookies.email
  const token = req.cookies.token
  const page = parseInt(req.params.page) || 1 // Default to page 1 if no page parameter is provided

  try {
    const user = await User.authenticate(email, token)
    const sentEmails = await Email.getEmailsBySenderId(user.id)

    // Sort the emails by timeSent in descending order (latest first)
    const sortedEmails = sentEmails.sort((a, b) => {
      const dateA = new Date(a.timeSent)
      const dateB = new Date(b.timeSent)
      return dateB.getTime() - dateA.getTime()
    })

    // Implement pagination
    const startIndex = (page - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    const paginatedEmails = sortedEmails.slice(startIndex, endIndex)

    res.render('layout', { title: 'Outbox', main: 'outbox', user, sentEmails: paginatedEmails, currentPage: page })
  } catch (err) {
    console.error(err)
    res.status(403).render('layout', { title: '403 - access denied', main: '403', err })
  }
})

app.get('/outbox/email/:id', async (req, res) => {
  const userEmail = req.cookies.email
  const token = req.cookies.token
  const emailId = Number(req.params.id)
  try {
    const user = await User.authenticate(userEmail, token)
    const email = await Email.getSentEmailById(emailId, user.id)
    if (email) {
      res.render('layout', { title: 'Email', main: 'email', user, email })
    } else {
      res.status(404).render('layout', { title: '404 - email not found', main: '404', user, notFound: 'email' })
    }
  } catch (err) {
    console.error(err)
    res.status(403).render('layout', { title: '403 - access denied', main: '403', err })
    // res.redirect('/')
  }
})

/* Compose */
app.get('/compose', async (req, res) => {
  const email = req.cookies.email
  const token = req.cookies.token
  try {
    const user = await User.authenticate(email, token)
    const users = await User.getAllUsers()
    res.render('layout', { title: 'Compose', main: 'compose', user, users })
  } catch (err) {
    console.error(err)
    res.status(403).render('layout', { title: '403 - access denied', main: '403', err })
    // res.redirect('/')
  }
})
app.post('/compose', upload.single('attachment'), async (req, res) => {
  const { recipientEmail, subject, body } = req.body
  const senderEmail = req.cookies.email
  const senderToken = req.cookies.token

  try {
    // Authenticate sender
    const sender = await User.authenticate(senderEmail, senderToken)

    // Find recipient by email
    const recipient = await User.getUserByEmail(recipientEmail)

    if (!recipient) {
      res.status(404).render('layout', { title: '404 - recipient not found', main: '404', user: sender, notFound: 'recipient' })
      return
    }

    // Handle file upload
    let attachmentOriginalName = null
    let attachmentSavedName = null

    if (req.file) {
      attachmentOriginalName = req.file.originalname
      attachmentSavedName = req.file.filename
    }

    await Email.createEmail(sender.id, recipient.id, subject, body, attachmentOriginalName, attachmentSavedName)

    res.redirect('/outbox') // Redirect to outbox after sending email
  } catch (err) {
    console.error(err)
    res.status(500).render('layout', { title: '500 - internal server error', main: '500' })
  }
})

/* Download attachment */
app.get('/attachment/:emailId', async (req, res) => {
  try {
    const emailId = parseInt(req.params.emailId)

    // Check if the conversion was successful and the result is a valid integer
    if (isNaN(emailId) || !Number.isInteger(emailId)) {
      res.status(400).send('Invalid emailId')
      return
    }

    // Fetch the email details, including the filename, from the database
    const email = await Email.getEmailById(emailId)

    if (!email || !email.attachmentSavedName) {
      res.status(404).send('File not found')
      return
    }

    const filename = email.attachmentSavedName
    const originalFilename = email.attachmentOriginalName
    const filePath = path.join(__dirname, 'uploads', filename)

    // Check if the user has access to the attachment
    const userEmail = req.cookies.email // Adjust as needed based on your authentication setup
    const userToken = req.cookies.token // Adjust as needed based on your authentication setup
    const hasAccess = await hasAccessToAttachment(userEmail, userToken, emailId)

    if (!hasAccess) {
      res.status(403).send('Access denied')
      return
    }

    // Check if the file exists
    const fileExists = await fsPromises.access(filePath)
      .then(() => true)
      .catch(() => false)

    if (!fileExists) {
      res.status(404).send('File not found')
      return
    }

    // Set the appropriate headers for the response
    res.setHeader('Content-Disposition', `attachment; filename=${originalFilename}`)
    res.setHeader('Content-Type', 'application/octet-stream')

    // Stream the file to the response
    const fileStream = fs.createReadStream(filePath)
    fileStream.pipe(res)
  } catch (err) {
    console.error(err)
    res.status(500).send('Internal server error')
  }
})

/* API */
app.delete('/api/emails', async (req, res) => {
  const emailIds = req.body.emailIds.map(id => parseInt(id))

  try {
    // Check if the user is authenticated
    const authenticatedUser = await User.authenticate(req.cookies.email, req.cookies.token)
    if (!authenticatedUser) {
      return res.status(403).json({ error: 'Unauthorized to delete emails' })
    }

    // Get emails by IDs
    const emails = await Promise.all(emailIds.map(id => Email.getEmailById(id)))

    // Check if all emails are found
    if (emails.some(email => !email)) {
      return res.status(404).json({ error: 'One or more emails not found' })
    }

    // Check if the authenticated user is the sender or recipient of all emails
    if (emails.some(email => email.senderId !== authenticatedUser.id && email.recipientId !== authenticatedUser.id)) {
      return res.status(403).json({ error: 'Unauthorized to delete these emails' })
    }

    // Delete emails based on sender or recipient
    await Promise.all(emails.map(async (email) => {
      if (email.senderId === authenticatedUser.id) {
        await Email.deleteEmailForSender(email.id, authenticatedUser.id)
      } else {
        await Email.deleteEmailForRecipient(email.id, authenticatedUser.id)
      }
      // Additional logic for handling attachments, if needed
    }))

    res.json({ success: true, message: 'Emails deleted successfully' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.listen(8000, () => {
  console.log('Server started on port 8000')
})
