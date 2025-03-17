// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDX1wefAWh1RKtq6MmIQTvj_20GC10TIKQ",
  authDomain: "routine-aa9ea.firebaseapp.com",
  projectId: "routine-aa9ea",
  storageBucket: "routine-aa9ea.firebasestorage.app",
  messagingSenderId: "589666199398",
  appId: "1:589666199398:web:768a35de8eb626ca4b0aa7"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore(); 