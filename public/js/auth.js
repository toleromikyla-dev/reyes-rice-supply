const API_BASE_URL = "http://localhost:5000/api";

const loginForm = document.getElementById("loginForm");
const errorBox = document.getElementById("errorBox");

loginForm?.addEventListener("submit", async (e) => {

e.preventDefault();

const username = document.getElementById("username").value;
const password = document.getElementById("password").value;

try{

const res = await fetch(`${API_BASE_URL}/login`,{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({username,password})

});

const data = await res.json();

if(!res.ok){
errorBox.innerText = data.message || "Login failed";
return;
}

localStorage.setItem("token",data.token);
localStorage.setItem("user",JSON.stringify(data.user));

window.location.href="/dashboard.html";

}catch{

errorBox.innerText="Unable to connect to the server";

}

});


function openRegister(){

document.getElementById("registerModal").style.display="flex";

}

function closeRegister(){

document.getElementById("registerModal").style.display="none";

}


document.getElementById("registerForm")?.addEventListener("submit", async(e)=>{

e.preventDefault();

const payload={

full_name:document.getElementById("reg_fullname").value,
username:document.getElementById("reg_username").value,
password:document.getElementById("reg_password").value

};

await fetch(`${API_BASE_URL}/register`,{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify(payload)

});

alert("Account created. You can now login.");

closeRegister();

});