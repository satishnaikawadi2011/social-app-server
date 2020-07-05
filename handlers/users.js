const { db, admin } = require('../utils/admin');
const { validationResult } = require('express-validator');
const config = require('../utils/config');
const firebase = require('firebase');
// const admin = require('../utils/admin');
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

	const noImg = 'no-img.png';

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
				imageUrl  : `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`,
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
			return res.status(500).json({ general: 'Something went wrong ,please try again !' });
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

			return res.status(403).json({ general: 'Wrong credentials,please try again !' });
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
		if (mimetype !== 'image/jpeg' && mimetype !== 'image/png') {
			return res.status(400).json({ error: 'Wrong file type submitted' });
		}
		const imageExtension = filename.split('.')[filename.split('.').length - 1];
		imageFileName = `${Math.round(Math.random() * 100000000)}.${imageExtension}`;
		const filePath = path.join(os.tmpdir(), imageFileName);
		imageToBeUploaded = { filePath, mimetype };
		file.pipe(fs.createWriteStream(filePath));
	});

	busboy.on('finish', () => {
		admin
			.storage()
			.bucket(config.storageBucket)
			.upload(imageToBeUploaded.filePath, {
				resumable : false,
				metadata  : {
					metadata : {
						contentType : imageToBeUploaded.mimetype
					}
				}
			})
			.then(() => {
				const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`;
				return db.doc(`/users/${req.user.handle}`).update({ imageUrl });
			})
			.then(() => {
				return res.json({ message: 'Image uploaded successfully !' });
			})
			.catch((err) => {
				console.error(err);
				return res.status(500).json({ error: err.code });
			});
	});
	busboy.end(req.rawBody);
};

exports.addUserDetails = (req, res) => {
	let userDetails = {};
	if (req.body.location) {
		userDetails.location = req.body.location.trim();
	}
	if (req.body.website) {
		if (req.body.website.trim().substring(0, 4) !== 'http') {
			userDetails.website = `http://${req.body.website.trim()}`;
		}
		else {
			userDetails.website = req.body.website;
		}
	}
	if (req.body.bio) {
		userDetails.bio = req.body.bio.trim();
	}

	db
		.doc(`/users/${req.user.handle}`)
		.update(userDetails)
		.then(() => {
			return res.json({ message: 'details added successfully !' });
		})
		.catch((err) => {
			console.error(err);
			return res.status(500).json({ error: err.code });
		});
};

exports.getAuthenticatedUser = (req, res) => {
	let userData = {};
	db
		.doc(`/users/${req.user.handle}`)
		.get()
		.then((doc) => {
			if (doc.exists) {
				userData.credentials = doc.data();
				return db.collection('likes').where('userHandle', '==', req.user.handle).get();
			}
		})
		.then((data) => {
			userData.likes = [];
			data.forEach((doc) => {
				userData.likes.push(doc.data());
			});
			return db
				.collection('notifications')
				.where('recipient', '==', req.user.handle)
				.orderBy('createdAt', 'desc')
				.limit(10)
				.get();
		})
		.then((data) => {
			userData.notifications = [];
			data.forEach((doc) => {
				userData.notifications.push({
					recipient      : doc.data().recipient,
					sender         : doc.data().sender,
					type           : doc.data().type,
					read           : doc.data().read,
					createdAt      : doc.data().createdAt,
					screamId       : doc.data().screamId,
					notificationId : doc.id
				});
			});
			return res.json(userData);
		})
		.catch((err) => {
			console.error(err);
			return res.status(500).json({ error: err.code });
		});
};

exports.getUserDetails = async (req, res) => {
	try {
		let userData = {};
		const doc = await db.doc(`/users/${req.params.handle}`).get();
		if (doc.exists) {
			userData.user = doc.data();
			const data = await db.collection('screams').where('userHandle', '==', req.params.handle).get();
			// console.log(data);
			userData.screams = [];
			data.forEach((doc) => {
				userData.screams.push({
					body         : doc.data().body,
					createdAt    : doc.data().createdAt,
					userHandle   : doc.data().userHandle,
					userImage    : doc.data().userImage,
					likeCount    : doc.data().likeCount,
					commentCount : doc.data().commentCount,
					screamId     : doc.id
				});
			});
			return res.json(userData);
		}
		else {
			return res.status(404).json({ error: 'User Not Found' });
		}
	} catch (err) {
		console.error(err);
		return res.status(500).json({ error: err.code });
	}
};

exports.markNotificationsAsRead = async (req, res) => {
	try {
		let batch = db.batch();
		req.body.forEach((notificationId) => {
			const notification = db.doc(`/notifications/${notificationId}`);
			batch.update(notification, { read: true });
		});
		await batch.commit();
		return res.json({ message: 'Notifications marked read !' });
	} catch (err) {
		console.error(err);
		return res.status(500).json({ error: err.code });
	}
};
