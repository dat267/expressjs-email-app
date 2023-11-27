# 61FIT3WPR – Web Programming (Fall 2023)

This project is a simple web-based Email System developed using Node.js and Express.js. It's a database-driven application that uses the EJS template engine for server-side rendering and a single API endpoint in the backend for the delete email feature.

## Getting Started

These instructions will help you get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- Node.js
- MySQL Database (XAMPP or Docker Image)

### Installing

1. Clone the repository to your local machine.
2. Install the necessary packages using `npm install`.
3. Set up the MySQL database using XAMPP on Windows with the following [configuration](#project-details). Or use `docker-compose.yml` by running `docker-compose up -d` at project root.
4. Run `node dbsetup.js` to set up the database.
5. Start the server using `node index.js`.

## Project Details

The project consists of the following features:

- Sign-in page (which is also the home page)
- Sign-up page
- Sign-out route
- Inbox page (show received emails, successful sign-in redirects here)
- Single email detail page (lets user reads an email)
- Outbox page (show sent emails)
- Compose page (let user create and send an email, may contain attached file, to one receiver)

The application must use the MySQL database named `wpr2023`, with username `wpr`, password `fit2023`, on host `localhost`, port `3306`.

The application must operate on `http://localhost:8000/`.

The application must be developed with only the packages listed in the provided `package.json`.

### Testing

The application is tested manually by visiting the different pages and ensuring that the functionality works as expected.

## Authors

- **Dat Do** - *Initial work* - [dat267](https://github.com/dat267)

## Acknowledgments

- Thanks to the instructors for providing the assignment.
- Thanks to the TAs for their support and guidance.
- Thanks to the classmates for their collaboration and learning together.
