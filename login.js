// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider
} from "https://www.gstatic.com/firebasejs/11.7.3/firebase-auth.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAEuVGWjQc9jsdK6MxhgDCyuGtVHK49evo",
  authDomain: "myweb-455da.firebaseapp.com",
  projectId: "myweb-455da",
  storageBucket: "myweb-455da.appspot.com",
  messagingSenderId: "589487771494",
  appId: "1:589487771494:web:98f6e38c403526f47d02a7",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Email/Password login
document.getElementById("submit").addEventListener("click", function (e) {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      const user = userCredential.user;
      alert(`Welcome back, ${user.email}`);
      window.location.href = "welcome.html"; // Redirect after login
    })
    .catch((error) => {
      alert("Login failed: " + error.message);
    });
});

// Google Sign-In
document.getElementById("google-signin").addEventListener("click", function () {
  const provider = new GoogleAuthProvider();
  signInWithPopup(auth, provider)
    .then((result) => {
      const user = result.user;
      alert(`Welcome, ${user.displayName}`);
      window.location.href = "welcome.html";
    })
    .catch((error) => {
      alert("Google login failed: " + error.message);
    });
});

// Facebook Sign-In
document.getElementById("facebook-signin").addEventListener("click", function () {
  const provider = new FacebookAuthProvider();
  signInWithPopup(auth, provider)
    .then((result) => {
      const user = result.user;
      alert(`Welcome, ${user.displayName}`);
      window.location.href = "welcome.html";
    })
    .catch((error) => {
      alert("Facebook login failed: " + error.message);
    });
});
