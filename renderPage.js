exports.renderPage = function (res, title, main, user) {
  res.render('layout', {title: title, main: main, user: user});
};
