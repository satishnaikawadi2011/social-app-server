const functions = require('firebase-functions');
const express = require('express');
const auth = require('./utils/auth');
const { check } = require('express-validator');
const { db } = require('./utils/admin');
const {
	getAllScreams,
	createScream,
	getScream,
	commentOnScream,
	likeScream,
	unlikeScream,
	deleteScream
} = require('./handlers/screams');
const {
	signup,
	login,
	uploadImage,
	addUserDetails,
	getAuthenticatedUser,
	getUserDetails,
	markNotificationsAsRead
} = require('./handlers/users');
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

// @desc   get a scream by its id
// @access Public
app.get('/scream/:screamId', getScream);

// @desc   commenting on a scream
// @access Private
app.post('/scream/:screamId/comment', auth, commentOnScream);

// @desc   like a scream
// @access Private
app.get('/scream/:screamId/like', auth, likeScream);

// @desc   like a scream
// @access Private
app.get('/scream/:screamId/unlike', auth, unlikeScream);

// @desc   delete a scream
// @access Private
app.delete('/scream/:screamId', auth, deleteScream);

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

app.post('/user/image', auth, uploadImage);

app.post('/user', auth, addUserDetails);

app.get('/user', auth, getAuthenticatedUser);

app.get('/user/:handle', getUserDetails);

app.post('/notifications', auth, markNotificationsAsRead);
// -----------------------------------------------------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------------------------------------------------------

exports.api = functions.https.onRequest(app);

exports.createNotificationOnLike = functions.firestore.document('likes/{id}').onCreate(async (snapshot) => {
	try {
		const doc = await db.doc(`/screams/${snapshot.data().screamId}`).get();
		if (doc.exists) {
			await db.doc(`/notifications/${snapshot.id}`).set({
				createdAt : new Date().toISOString(),
				recipient : doc.data().userHandle,
				sender    : snapshot.data().userHandle,
				type      : 'like',
				read      : false,
				screamId  : doc.id
			});
		}
	} catch (err) {
		console.error(err);
		return;
	}
});

exports.deleteNotificationOnUnlike = functions.firestore.document('likes/{id}').onDelete(async (snapshot) => {
	try {
		await db.doc(`/notifications,${snapshot.id}`).delete();
	} catch (err) {
		console.error(err);
		return;
	}
});

exports.createNotificationOnComment = functions.firestore.document('comments/{id}').onCreate(async (snapshot) => {
	try {
		const doc = await db.doc(`/screams/${snapshot.data().screamId}`).get();
		if (doc.exists) {
			await db.doc(`/notifications/${snapshot.id}`).set({
				createdAt : new Date().toISOString(),
				recipient : doc.data().userHandle,
				sender    : snapshot.data().userHandle,
				type      : 'comment',
				read      : false,
				screamId  : doc.id
			});
		}
	} catch (err) {
		console.error(err);
		return;
	}
});
