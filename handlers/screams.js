const { db } = require('../utils/admin');

exports.getAllScreams = (req, res) => {
	db
		.collection('screams')
		.orderBy('createdAt', 'desc')
		.get()
		.then((data) => {
			let screams = [];
			data.forEach((doc) => {
				screams.push({
					userHandle   : doc.data().userHandle,
					screamId     : doc.id,
					createdAt    : doc.data().createdAt,
					body         : doc.data().body,
					commentCount : doc.data().commentCount,
					likeCount    : doc.data().likeCount,
					userImage    : doc.data().userImage
				});
			});
			return res.json(screams);
		})
		.catch((err) => console.log(err));
};

exports.createScream = (req, res) => {
	if (req.body.body.trim() === '') {
		return res.status(400).json({ body: 'Body must not be empty' });
	}
	const newScream = {
		body         : req.body.body,
		userHandle   : req.user.handle,
		createdAt    : new Date().toISOString(),
		userImage    : req.user.imageUrl,
		likeCount    : 0,
		commentCount : 0
	};

	db
		.collection('screams')
		.add(newScream)
		.then((doc) => {
			const resScream = newScream;
			resScream.screamId = doc.id;
			res.json(resScream);
		})
		.catch((err) => {
			res.status(500).json({ error: 'something went wrong' });
			console.error(err);
		});
};

exports.getScream = (req, res) => {
	let screamData = {};
	db
		.doc(`/screams/${req.params.screamId}`)
		.get()
		.then((doc) => {
			if (!doc.exists) {
				return res.status(404).json({ error: 'Scream not found !' });
			}
			screamData = doc.data();
			screamData.screamId = doc.id;
			return db
				.collection('comments')
				.orderBy('createdAt', 'desc')
				.where('screamId', '==', req.params.screamId)
				.get();
		})
		.then((data) => {
			screamData.comments = [];
			data.forEach((doc) => {
				screamData.comments.push(doc.data());
			});
			return res.json(screamData);
		})
		.catch((err) => {
			console.error(err);
			return res.status(500).json({ error: err.code });
		});
};

exports.commentOnScream = (req, res) => {
	if (req.body.body.trim() === '') return res.status(400).json({ error: 'comment Must not be empty !' });

	const newComment = {
		body       : req.body.body,
		createdAt  : new Date().toISOString(),
		userHandle : req.user.handle,
		screamId   : req.params.screamId,
		userImage  : req.user.imageUrl
	};
	db
		.doc(`/screams/${req.params.screamId}`)
		.get()
		.then((doc) => {
			if (!doc.exists) {
				return res.status(404).json({ error: 'Scream Not Found !' });
			}
			return doc.ref.update({ commentCount: doc.data().commentCount + 1 });
		})
		.then(() => {
			return db.collection('comments').add(newComment);
		})
		.then(() => {
			return res.json(newComment);
		})
		.catch((err) => {
			console.error(err);
			return res.status(500).json({ error: 'Something went wrong!' });
		});
};

exports.likeScream = (req, res) => {
	const likeDocument = db
		.collection('likes')
		.where('userHandle', '==', req.user.handle)
		.where('screamId', '==', req.params.screamId)
		.limit(1);
	const screamDocument = db.doc(`/screams/${req.params.screamId}`);
	let screamData;
	screamDocument
		.get()
		.then((doc) => {
			if (doc.exists) {
				screamData = doc.data();
				screamData.screamId = doc.id;
				return likeDocument.get();
			}
			else {
				return res.status(404).json({ error: 'Scream Not Found !' });
			}
		})
		.then((data) => {
			if (data.empty) {
				return db
					.collection('likes')
					.add({
						screamId   : req.params.screamId,
						userHandle : req.user.handle
					})
					.then(() => {
						screamData.likeCount++;
						return screamDocument.update({ likeCount: screamData.likeCount });
					})
					.then(() => {
						return res.json(screamData);
					});
			}
			else {
				return res.status(400).json({ error: 'Scream already liked!' });
			}
		})
		.catch((err) => {
			console.error(err);
			return res.status(500).json({ error: err.code });
		});
};

exports.unlikeScream = (req, res) => {
	const likeDocument = db
		.collection('likes')
		.where('userHandle', '==', req.user.handle)
		.where('screamId', '==', req.params.screamId)
		.limit(1);
	const screamDocument = db.doc(`/screams/${req.params.screamId}`);
	let screamData;
	screamDocument
		.get()
		.then((doc) => {
			if (doc.exists) {
				screamData = doc.data();
				screamData.screamId = doc.id;
				return likeDocument.get();
			}
			else {
				return res.status(404).json({ error: 'Scream Not Found !' });
			}
		})
		.then((data) => {
			if (data.empty) {
				return res.status(400).json({ error: 'Scream not liked!' });
			}
			else {
				return db
					.doc(`/likes/${data.docs[0].id}`)
					.delete()
					.then(() => {
						screamData.likeCount--;
						return screamDocument.update({ likeCount: screamData.likeCount });
					})
					.then(() => {
						return res.json(screamData);
					});
			}
		})
		.catch((err) => {
			console.error(err);
			return res.status(500).json({ error: err.code });
		});
};

exports.deleteScream = async (req, res) => {
	const document = db.doc(`/screams/${req.params.screamId}`);
	try {
		const doc = await document.get();
		if (!doc.exists) {
			return res.status(404).json({ error: 'Scream Not Found !' });
		}
		if (doc.data().userHandle !== req.user.handle) {
			return res.status(403).json({ error: 'Unauthorized !' });
		}
		else {
			await document.delete();
			res.json({ message: 'Scream deleted successfully !' });
		}
	} catch (err) {
		console.error(err);
		return res.status(500).json({ error: err.code });
	}
};
