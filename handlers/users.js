const { db } = require('../utils/admin');
const { validationResult } = require('express-validator');
const config = require('../utils/config');
const firebase = require('firebase');
firebase.initializeApp(config);

exports.signup = (req, res) => {
	const newUser = {
		email           : req.body.email,
		password        : req.body.password,
		confirmPassword : req.body.confirmPassword,
		handle          : req.body.handle
	};

	const errors = validationResult(req);
	if (newUser.password !== newUser.confirmPassword) {
		errors.confirmPassword = 'passwords must match';
		return res.status(400).json({ error: 'Invalid Inputs!' });
	}
	if (!errors.isEmpty()) {
		return res.status(400).json({ error: 'Invalid Inputs!' });
	}

	let userId, token;
	db
		.doc(`/users/${newUser.handle}`)
		.get()
		.then((doc) => {
			if (doc.exists) {
				return res.status(400).json({ handle: 'this handle is already taken' });
			}
			else {
				return firebase.auth().createUserWithEmailAndPassword(newUser.email, newUser.password);
			}
		})
		.then((data) => {
			userId = data.user.uid;
			return data.user.getIdToken();
		})
		.then((idToken) => {
			token = idToken;
			const userCredentials = {
				handle    : newUser.handle,
				email     : newUser.email,
				createdAt : new Date().toISOString(),
				userId
			};

			return db.doc(`/users/${newUser.handle}`).set(userCredentials);
		})
		.then(() => {
			return res.status(201).json({ token });
		})
		.catch((err) => {
			console.error(err);
			if (err.code == 'auth/email-already-in-use') {
				return res.status(400).json({ email: 'Email is already in use' });
			}
			return res.status(500).json({ error: err.code });
		});
};

exports.login = (req, res) => {
	const user = {
		email    : req.body.email,
		password : req.body.password
	};

	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.status(400).json({ error: 'Invalid Inputs!' });
	}
	firebase
		.auth()
		.signInWithEmailAndPassword(user.email, user.password)
		.then((data) => {
			return data.user.getIdToken();
		})
		.then((token) => {
			return res.json({ token });
		})
		.catch((err) => {
			console.error(err);
			if (err.code === 'auth/wrong-password') {
				return res.status(403).json({ general: 'Wrong credentials,please try again !' });
			}
			return res.status(500).json({ error: err.code });
		});
};

exports.uploadImage = (req, res) => {
	const BusBoy = require('busboy');
	const path = require('path');
	const os = require('os');
	const fs = require('fs');

	const busboy = new BusBoy({ headers: req.headers });
	let imageFileName;
	let imageToBeUploaded = {};

	busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
		const imageExtension = filename.split('.')[filename.split('.').length - 1];
		imageFileName = `${Math.round(Math.random() * 100000000)}.${imageExtension}`;
		const filePath = path.join(os.tmpdir(), imageFileName);
		imageToBeUploaded = { filePath, mimetype };
	});
};
