const express = require('express')
const cookieParser = require('cookie-parser')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const fsPromises = require('fs/promises')
const { Email } = require('./middleware/Email')
const { User } = require('./middleware/User')
const { hasAccessToAttachment } = require('./middleware/Attachment')

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
  res.redirect('/inbox/1')
})
app.get('/inbox/:page', async (req, res) => {
  const email = req.cookies.email
  const token = req.cookies.token
  try {
    const user = await User.authenticate(email, token)
    const page = parseInt(req.params.page, 10) || 1
    const startIndex = (page - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    const receivedEmails = await Email.getEmailsByRecipientId(user.id)
    const sortedEmails = receivedEmails.sort((a, b) => {
      const dateA = new Date(a.timeSent)
      const dateB = new Date(b.timeSent)
      return dateB.getTime() - dateA.getTime()
    })
    const paginatedEmails = sortedEmails.slice(startIndex, endIndex)
    res.render('layout', { title: 'Inbox', main: 'inbox', user, receivedEmails: paginatedEmails, currentPage: page, totalPages: Math.ceil(receivedEmails.length / ITEMS_PER_PAGE) })
  } catch (err) {
    console.error(err)
    res.status(403).render('layout', { title: '403 - access denied', main: '403', err })
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
  }
})

/* Outbox */
app.get('/outbox', (req, res) => {
  res.redirect('/outbox/1')
})
app.get('/outbox/:page', async (req, res) => {
  const email = req.cookies.email
  const token = req.cookies.token
  const page = parseInt(req.params.page) || 1
  try {
    const user = await User.authenticate(email, token)
    const sentEmails = await Email.getEmailsBySenderId(user.id)
    const sortedEmails = sentEmails.sort((a, b) => {
      const dateA = new Date(a.timeSent)
      const dateB = new Date(b.timeSent)
      return dateB.getTime() - dateA.getTime()
    })
    const startIndex = (page - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    const paginatedEmails = sortedEmails.slice(startIndex, endIndex)
    res.render('layout', { title: 'Outbox', main: 'outbox', user, sentEmails: paginatedEmails, currentPage: page, totalPages: Math.ceil(sentEmails.length / ITEMS_PER_PAGE) })
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
  }
})
app.post('/compose', upload.single('attachment'), async (req, res) => {
  const { recipientEmail, subject, body } = req.body
  const senderEmail = req.cookies.email
  const senderToken = req.cookies.token
  try {
    const users = await User.getAllUsers()
    const sender = await User.authenticate(senderEmail, senderToken)
    const recipient = await User.getUserByEmail(recipientEmail)
    if (!recipient) {
      res.status(404).render('layout', { title: '404 - recipient not found', main: '404', user: sender, notFound: 'recipient' })
      return
    }
    if (!recipientEmail) {
      res.render('layout', { title: 'Compose', main: 'compose', user: sender, users, errorMessage: 'Please select a recipient.' })
      res.redirect('/compose')
      return
    }
    let attachmentOriginalName = null
    let attachmentSavedName = null
    if (req.file) {
      attachmentOriginalName = req.file.originalname
      attachmentSavedName = req.file.filename
    }
    await Email.createEmail(sender.id, recipient.id, subject, body, attachmentOriginalName, attachmentSavedName)
    res.render('layout', { title: 'Compose', main: 'compose', user: sender, users, successMessage: 'Email sent successfully!' })
  } catch (err) {
    console.error(err)
    res.status(500).render('layout', { title: '500 - internal server error', main: '500' })
  }
})

/* Download attachment */
app.get('/attachment/:emailId', async (req, res) => {
  try {
    const emailId = parseInt(req.params.emailId)
    if (isNaN(emailId) || !Number.isInteger(emailId)) {
      res.status(400).render('layout', { title: '400 - invalid emailId', main: '400' })
      return
    }
    const email = await Email.getEmailById(emailId)
    if (!email || !email.attachmentSavedName) {
      res.status(404).render('layout', { title: '404 - file not found', main: '404', notFound: 'file' })
      return
    }
    const filename = email.attachmentSavedName
    const originalFilename = email.attachmentOriginalName
    const filePath = path.join(__dirname, 'uploads', filename)
    const userEmail = req.cookies.email
    const userToken = req.cookies.token
    const hasAccess = await hasAccessToAttachment(userEmail, userToken, emailId)
    if (!hasAccess) {
      res.status(403).render('layout', { title: '403 - access denied', main: '403' })
      return
    }
    const fileExists = await fsPromises.access(filePath)
      .then(() => true)
      .catch(() => false)

    if (!fileExists) {
      res.status(404).render('layout', { title: '404 - file not found', main: '404', notFound: 'file' })
      return
    }
    res.setHeader('Content-Disposition', `attachment; filename=${originalFilename}`)
    res.setHeader('Content-Type', 'application/octet-stream')
    const fileStream = fs.createReadStream(filePath)
    fileStream.pipe(res)
  } catch (err) {
    console.error(err)
    res.status(500).render('layout', { title: '500 - internal server error', main: '500' })
  }
})

/* API */
app.delete('/api/emails', async (req, res) => {
  const emailIds = req.body.emailIds.map(id => parseInt(id))
  try {
    const authenticatedUser = await User.authenticate(req.cookies.email, req.cookies.token)
    if (!authenticatedUser) {
      return res.status(403).json({ error: 'Unauthorized to delete emails' })
    }
    const emails = await Promise.all(emailIds.map(id => Email.getEmailById(id)))
    if (emails.some(email => !email)) {
      return res.status(404).json({ error: 'One or more emails not found' })
    }
    if (emails.some(email => email.senderId !== authenticatedUser.id && email.recipientId !== authenticatedUser.id)) {
      return res.status(403).json({ error: 'Unauthorized to delete emails' })
    }
    await Promise.all(emails.map(async (email) => {
      if (email.senderId === authenticatedUser.id) {
        await Email.deleteEmailForSender(email.id, authenticatedUser.id)
      } else {
        await Email.deleteEmailForRecipient(email.id, authenticatedUser.id)
      }
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
