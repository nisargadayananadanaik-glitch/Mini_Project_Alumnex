
const API = "/api/auth";

const registerForm = document.getElementById("registerForm");
const loginForm = document.getElementById("loginForm");

if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const message = document.getElementById("message");

        try {
            const response = await fetch(`${API}/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name: document.getElementById("name").value,
                    email: document.getElementById("email").value,
                    password: document.getElementById("password").value,
                    role: document.getElementById("role").value
                })
            });

            const data = await response.json();
            message.textContent = data.message;

            if (response.ok) {
                registerForm.reset();
            }
        } catch (error) {
            message.textContent = "Unable to connect to server.";
        }
    });
}

if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const message = document.getElementById("message");

        try {
            const response = await fetch(`${API}/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email: document.getElementById("email").value,
                    password: document.getElementById("password").value
                })
            });

            const data = await response.json();

            if (!response.ok) {
                message.textContent = data.message;
                return;
            }

            // Prototype storage; replace with secure HTTP-only
            // cookie authentication before production.
            sessionStorage.setItem("alumnexUser", JSON.stringify(data.user));
            sessionStorage.setItem("alumnexToken", data.token);

            window.location.href = "dashboard.html";

        } catch (error) {
            message.textContent = "Unable to connect to server.";
        }
    });
}
