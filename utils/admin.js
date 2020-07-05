const admin = require('firebase-admin');
// const serviceAccount = require('../../serviceAccountKey.json');

// admin.initializeApp({
// 	credential  : admin.credential.cert(serviceAccount),
// 	databaseURL : 'https://social-app-97a4d.firebaseio.com'
// });
admin.initializeApp();

const db = admin.firestore();

module.exports = { admin, db };
