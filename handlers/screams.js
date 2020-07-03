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
					likeCount    : doc.data().likeCount
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
		body       : req.body.body,
		userHandle : req.user.handle,
		createdAt  : new Date().toISOString()
	};

	db
		.collection('screams')
		.add(newScream)
		.then((doc) => {
			res.json({ message: `document ${doc.id} created successfully` });
		})
		.catch((err) => {
			res.status(500).json({ error: 'something went wrong' });
			console.error(err);
		});
};
