const express = require('express')
const cookieParser = require('cookie-parser')
const { Email } = require('./models/Email')
const { User } = require('./models/User')

const app = express()

app.use(express.static('public'))

app.set('view engine', 'ejs')

/* Middleware */
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

/* Functions */
const ITEMS_PER_PAGE = 10 // Adjust this based on your preference

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

    // Extract only the emails for the current page
    const paginatedEmails = receivedEmails.slice(startIndex, endIndex)

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

    // Implement pagination
    const startIndex = (page - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    const paginatedEmails = sentEmails.slice(startIndex, endIndex)

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
    res.render('layout', { title: 'Compose', main: 'compose', user })
  } catch (err) {
    console.error(err)
    res.status(403).render('layout', { title: '403 - access denied', main: '403', err })
    // res.redirect('/')
  }
})

app.listen(8000, () => {
  console.log('Server started on port 8000')
})
