const express = require('express');
const cookieParser = require('cookie-parser');
const {renderPage} = require('./renderPage');
const {signin, signup, authenticate, findUserByEmail} = require('./models/User');

const app = express();

app.use(express.static('public'));

app.set('view engine', 'ejs');

// Middleware
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cookieParser());

/* Sign in */
app.get('/', (req, res) => {
    const email = req.cookies.email;
    const token = req.cookies.accessToken;
    authenticate(email, token, (err, userObject) => {
        if (err || !userObject) {
            renderPage(res, 'Sign in', 'signin', null);
        } else {
            res.redirect('/inbox');
        }
    });
});
app.post('/signin', (req, res) => {
    const {email, password} = req.body;
    const oneDay = 60 * 60 * 24 * 1000;
    signin(email, password, function (err, user) {
        if (err) {
            res.status(500).json({error: err.message});
            // res.redirect('/');
        } else {
            res.cookie('email', user.email, {maxAge: oneDay});
            res.cookie('fullName', user.fullName, {maxAge: oneDay});
            res.cookie('accessToken', user.accessToken, {maxAge: oneDay});
            res.redirect('/inbox');
        }
    });
});

/* Sign up */
app.get('/signup', (req, res) => {
    renderPage(res, 'Sign up', 'signup');
});
app.post('/signup', (req, res) => {
    const {fullName, email, password, rePassword} = req.body;
    signup(fullName, email, password, rePassword, (err, message) => {
        if (err) {
            res.status(500).json({error: err.message});
        } else {
            res.send(message);
        }
    });
});

/* Sign out */
app.get('/signout', (req, res) => {
    res.clearCookie('email');
    res.clearCookie('fullName');
    res.clearCookie('accessToken');
    res.redirect('/');
});

/* Inbox */
app.get('/inbox', (req, res) => {
    const email = req.cookies.email;
    const accessToken = req.cookies.accessToken;
    authenticate(email, accessToken, (err, userObject) => {
        if (err || !userObject) {
            res.redirect('/');
        } else {
            renderPage(res, 'Inbox', 'inbox', userObject);
        }
    });
});

/* Outbox */
app.get('/outbox', (req, res) => {
    const email = req.cookies.email;
    const accessToken = req.cookies.accessToken;
    authenticate(email, accessToken, (err, userObject) => {
        if (err || !userObject) {
            res.redirect('/');
        } else {
            renderPage(res, 'Outbox', 'outbox', userObject);
        }
    });
});

/* Compose */
app.get('/compose', (req, res) => {
    const email = req.cookies.email;
    const accessToken = req.cookies.accessToken;
    authenticate(email, accessToken, (err, userObject) => {
        if (err || !userObject) {
            res.redirect('/');
        } else {
            renderPage(res, 'Compose', 'compose', userObject);
        }
    });
});

/* Check email api */
app.post('/checkEmail', (req, res) => {
    const {email} = req.body;
    findUserByEmail(email, (err, userObject) => {
        if (err) throw err;
        if (userObject) {
            res.json({exists: true});
        }
        else {
            res.json({exists: false});
        }
    });
});

app.listen(8000, () => {
    console.log('Server started on port 8000');
});
