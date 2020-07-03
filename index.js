const functions = require('firebase-functions');
const express = require('express');
const auth = require('../functions/utils/auth');
const { check } = require('express-validator');
const { getAllScreams, createScream } = require('./handlers/screams');
const { signup, login, uploadImage } = require('./handlers/users');
const app = express();

// admin.initializeApp();

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions

// -----------------------------------------------------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------------------------------------------------------

// SCREAM ROUTES

// @access Public
// @desc   get all screams
app.get('/screams', getAllScreams);

// @desc    create a scream
// @access  Private
app.post('/scream', auth, createScream);

// -----------------------------------------------------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------------------------------------------------------

//  USER ROUTES

// signup route
app.post(
	'/signup',
	[
		check('email').isEmail().withMessage('Enter a valid email address').not().isEmpty(),
		check('handle').not().isEmpty().withMessage('handle must not be empty'),
		check('password').not().isEmpty().withMessage('Passwprd must not be empty'),
		check('confirmPassword').not().isEmpty().withMessage('confirmPasswprd must not be empty')
	],
	signup
);

// login route
app.post(
	'/login',
	[
		check('email').isEmail().withMessage('Enter a valid email address').not().isEmpty(),
		check('password').not().isEmpty().withMessage('passwprd must not be empty')
	],
	login
);

app.post('/user/image', uploadImage);
// -----------------------------------------------------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------------------------------------------------------

exports.api = functions.https.onRequest(app);
