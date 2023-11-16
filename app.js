const express = require('express')
const mysql = require('mysql2')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const session = require('express-session')

const app = express()

// Set view engine to EJS
app.set('view engine', 'ejs')

// Middleware
app.use(bodyParser.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(session({
    key: 'userId',
    secret: 'secretkey',
    resave: false,
    saveUninitialized: false,
    cookie: {
        expires: 60 * 60 * 24 // 1 day
    }
}))

// DB connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'wpr',
    password: 'fit2023',
    database: 'wpr2023',
    port: '3306'
})

// Sign-up page route
app.get('/signup', (req, res) => {
    res.render('signup')
})

// Sign-in page route
app.get('/', (req, res) => {
    res.render('signin')
})

// Sign-in page route
app.get('/inbox', (req, res) => {
    res.send('Inbox placeholder')
})

// Sign-in route
app.post('/signin', (req, res) => {
    const { email, password, remember } = req.body

    // Query the database
    const query = 'SELECT * FROM User WHERE email = ?'
    db.query(query, [email], (err, result) => {
        if (err) throw err

        // Check if user exists and password matches
        if (result.length > 0 && result[0].password === password) {
            // Store user id in session
            req.session.userId = result[0].id

            // Set a cookie if "Remember me" is checked
            if (remember) {
                res.cookie('rememberMe', result[0].id, { maxAge: 60 * 60 * 24 * 1000 }) // 1 day
            }

            // Redirect to inbox page
            res.redirect('/inbox')
        } else {
            // Show error message
            res.send('Login failed. Please check your email and password.')
        }
    })
})

app.listen(8000, () => {
    console.log('Server started on port 8000')
})
