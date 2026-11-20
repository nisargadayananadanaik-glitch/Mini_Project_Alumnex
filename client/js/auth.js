const API_BASE = "/api";

function showAuthMessage(message, type = "error") {
    const box = document.getElementById("authMessage");
    if (!box) return;

    box.textContent = message;
    box.className = `auth-message ${type}`;
}

function setButtonLoading(button, loading, normalText) {
    if (!button) return;
    button.disabled = loading;
    button.textContent = loading ? "Please wait..." : normalText;
}

// LOGIN
const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const button = document.getElementById("loginButton");
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        setButtonLoading(button, true, "Sign In →");

        try {
            const response = await fetch(`${API_BASE}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || "Login failed.");
            }

            localStorage.setItem("alumnexToken", data.token);
            localStorage.setItem("alumnexUser", JSON.stringify(data.user));

            showAuthMessage("Login successful. Opening your dashboard...", "success");

            window.location.href = "dashboard.html";
        } catch (error) {
            showAuthMessage(error.message);
        } finally {
            setButtonLoading(button, false, "Sign In →");
        }
    });
}

// REGISTRATION
const registerForm = document.getElementById("registerForm");

if (registerForm) {
    const roleSelect = document.getElementById("role");
    const studentFields = document.getElementById("studentFields");
    const alumniFields = document.getElementById("alumniFields");
    const studyYear = document.getElementById("study_year");
    const semester = document.getElementById("semester");
    const graduationYear = document.getElementById("graduation_year");
    const alumniCollege = document.getElementById("alumniCollege");
    const otherCollegeFields = document.getElementById("otherCollegeFields");
    const otherCollege = document.getElementById("otherCollege");

    function updateCollegeField() {
        const needsCustomCollege = alumniCollege?.value === "Other";
        if (otherCollegeFields) {
            otherCollegeFields.hidden = !needsCustomCollege;
        }
        if (otherCollege) {
            otherCollege.required = Boolean(needsCustomCollege);
        }
    }

    function updateRegistrationFields() {
        const isStudent = roleSelect.value === "student";

        studentFields.hidden = !isStudent;
        alumniFields.hidden = isStudent;

        document.getElementById("department").required = isStudent;
        document.getElementById("alumniDepartment").required = !isStudent;
        studyYear.required = isStudent;
        semester.required = isStudent;
        graduationYear.required = !isStudent;
        alumniCollege.required = !isStudent;
        updateCollegeField();
    }

    roleSelect.addEventListener("change", updateRegistrationFields);
    alumniCollege?.addEventListener("change", updateCollegeField);
    updateRegistrationFields();

    registerForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const button = document.getElementById("registerButton");
        const formData = new FormData(registerForm);
        const role = formData.get("role");
        const password = formData.get("password");

        if (password !== formData.get("confirmPassword")) {
            showAuthMessage("Passwords do not match.");
            return;
        }

        const department = role === "student"
            ? String(formData.get("department") || "").trim()
            : String(formData.get("alumni_department") || "").trim();

        const payload = {
            name: String(formData.get("name") || "").trim(),
            email: String(formData.get("email") || "").trim(),
            phone: String(formData.get("phone") || "").trim(),
            password,
            role,
            department
        };

        if (role === "student") {
            payload.study_year = formData.get("study_year");
            payload.semester = formData.get("semester");
        } else {
            const selectedCollege = String(formData.get("college") || "").trim();
            payload.college = selectedCollege === "Other"
                ? String(formData.get("other_college") || "").trim()
                : selectedCollege;
            payload.graduation_year = formData.get("graduation_year");
            payload.company = String(formData.get("company") || "").trim();
            payload.designation = String(formData.get("designation") || "").trim();
        }

        setButtonLoading(button, true, "Create Account →");

        try {
            const response = await fetch(`${API_BASE}/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || "Registration failed.");
            }

            showAuthMessage(data.message, "success");
            registerForm.reset();
            updateRegistrationFields();

            setTimeout(() => {
                window.location.href = "login.html";
            }, 1600);

        } catch (error) {
            showAuthMessage(error.message);
        } finally {
            setButtonLoading(button, false, "Create Account →");
        }
    });
}