// Firebase core + auth
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-analytics.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider
} from "https://www.gstatic.com/firebasejs/11.7.3/firebase-auth.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAEuVGWjQc9jsdK6MxhgDCyuGtVHK49evo",
  authDomain: "myweb-455da.firebaseapp.com",
  projectId: "myweb-455da",
  storageBucket: "myweb-455da.appspot.com",
  messagingSenderId: "589487771494",
  appId: "1:589487771494:web:98f6e38c403526f47d02a7",
  measurementId: "G-MXMS9RRHT1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);

// Email/Password Sign-Up
const submit = document.getElementById('submit');
submit.addEventListener("click", function(event){
  event.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
        alert("Creating Account.....")
        window.location.href = "welcome.html";
    })
    .catch((error) => {
        alert(error.message);
    });
});

// Google Sign-In
document.getElementById("google-signup").addEventListener("click", () => {
  const provider = new GoogleAuthProvider();
  signInWithPopup(auth, provider)
    .then((result) => {
      const user = result.user;
      alert(`Welcome, ${user.displayName}`);
      window.location.href = "welcome.html";
    })
    .catch((error) => {
      alert("Google sign-in failed: " + error.message);
    });
});

// Facebook Sign-In
document.getElementById("facebook-signup").addEventListener("click", () => {
  const provider = new FacebookAuthProvider();
  signInWithPopup(auth, provider)
    .then((result) => {
      const user = result.user;
      alert(`Welcome, ${user.displayName}`);
      window.location.href = "welcome.html";
    })
    .catch((error) => {
      alert("Facebook sign-in failed: " + error.message);
    });
});
