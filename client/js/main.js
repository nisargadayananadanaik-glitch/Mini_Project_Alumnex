
const API = "/api";

const token = localStorage.getItem("alumnexToken");
let currentUser = null;

try {
    currentUser = JSON.parse(localStorage.getItem("alumnexUser") || "null");
} catch {
    localStorage.removeItem("alumnexUser");
}

let currentProfile = null;

if (!token || !currentUser) {
    window.location.href = "login.html";
}

const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
};

async function apiRequest(endpoint, options = {}) {
    const response = await fetch(`${API}${endpoint}`, {
        ...options,
        headers: {
            ...headers,
            ...(options.headers || {})
        }
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 401 || response.status === 403) {
        if (response.status === 401) logout();
    }

    if (!response.ok || data.success === false) {
        throw new Error(data.message || "Request failed.");
    }

    return data;
}

function logout() {
    localStorage.removeItem("alumnexToken");
    localStorage.removeItem("alumnexUser");
    window.location.href = "login.html";
}

function $(id) {
    return document.getElementById(id);
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function safeExternalUrl(value) {
    try {
        const url = new URL(String(value));
        return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
    } catch {
        return "";
    }
}

function showNotice(message, type = "success") {
    const notice = $("notice");
    if (!notice) return;

    notice.textContent = message;
    notice.className = `notice ${type}`;
    notice.classList.remove("hidden");

    window.scrollTo({ top: 0, behavior: "smooth" });

    setTimeout(() => notice.classList.add("hidden"), 4500);
}

function formatDate(value) {
    if (!value) return "Date not available";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return escapeHTML(value);

    return date.toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function setText(id, value) {
    if ($(id)) $(id).textContent = value ?? "";
}

function setAvatar(id, name, photoUrl) {
    const avatar = $(id);
    if (!avatar) return;

    const initial = name?.charAt(0).toUpperCase() || "A";
    let photo;

    try {
        photo = photoUrl ? new URL(photoUrl, window.location.origin) : null;
    } catch {
        photo = null;
    }

    if (!photo || (photo.protocol !== "https:" && photo.origin !== window.location.origin)) {
        avatar.textContent = initial;
        return;
    }

    const image = document.createElement("img");
    image.src = photo.href;
    image.alt = `${name || "User"} profile photo`;
    image.addEventListener("error", () => {
        avatar.textContent = initial;
    }, { once: true });
    avatar.replaceChildren(image);
}

function updateProfileCompletion(user, profile) {
    const commonFields = ["name", "email", "phone", "department", "bio", "photo_url"];
    const roleFields = user.role === "student"
        ? [
            "course", "study_year", "semester", "graduation_year", "skills",
            "interests", "career_goals", "resume_url", "linkedin_url", "github_url"
        ]
        : [
            "college", "graduation_year", "company", "designation", "skills",
            "work_experience", "linkedin_url", "career_journey"
        ];

    const fields = [...commonFields, ...roleFields];
    const completed = fields.filter(field =>
        String(field === "name" ? user.name : field === "email" ? user.email : profile[field] || "").trim()
    ).length;

    const percentage = Math.round(completed / fields.length * 100);

    setText("profileCompletion", `${percentage}%`);
    setText("profileCompletionDetail", `${percentage}%`);

    if ($("profileCompletionBar")) {
        $("profileCompletionBar").style.width = `${percentage}%`;
    }

    if ($("profileCompletionDetailBar")) {
        $("profileCompletionDetailBar").style.width = `${percentage}%`;
    }
}

function showSection(name) {
    document.querySelectorAll(".dashboard-section").forEach(section => {
        section.classList.toggle("active", section.id === `section-${name}`);
    });

    document.querySelectorAll(".nav-item").forEach(button => {
        button.classList.toggle("active", button.dataset.section === name);
    });

    const titles = {
        overview: "Overview",
        profile: "My Profile",
        alumni: "Alumni Directory",
        students: "Student Directory",
        events: "Events",
        jobs: "Career & Jobs",
        mentorship: "Mentorship",
        messages: "Messages",
        notifications: "Notifications",
        settings: "Settings",
        users: "Manage Users"
    };

    setText("pageTitle", titles[name] || "Dashboard");

    if (name === "alumni") loadAlumni();
    if (name === "students") loadStudents();
    if (name === "notifications") loadNotifications();
    if (name === "events") loadEvents();
    if (name === "jobs") loadJobs();
    if (name === "mentorship") loadMentorship();
}

$("profileShortcut")?.addEventListener("click", () => {
    showSection("profile");
    $("sidebar")?.classList.remove("sidebar-open");
});

document.querySelectorAll(".nav-item").forEach(button => {
    button.addEventListener("click", () => showSection(button.dataset.section));
});

document.querySelectorAll("[data-go]").forEach(button => {
    button.addEventListener("click", () => showSection(button.dataset.go));
});

$("logoutButton")?.addEventListener("click", logout);

$("mobileMenu")?.addEventListener("click", () => {
    $("sidebar").classList.toggle("sidebar-open");
});

function setupRoleUI() {
    const role = currentUser.role;

    document.querySelectorAll(".student-only").forEach(element => {
        element.classList.toggle("hidden", role !== "student");
    });

    document.querySelectorAll(".alumni-only").forEach(element => {
        element.classList.toggle("hidden", role !== "alumni");
    });

    document.querySelectorAll(".admin-only").forEach(element => {
        element.classList.toggle("hidden", role !== "admin");
    });

    const canCreateEvents = ["admin", "alumni"].includes(currentUser.role);

    $("eventAdminPanel")?.classList.toggle("hidden", !canCreateEvents);
    $("jobPostPanel")?.classList.toggle("hidden", role !== "alumni");

    setText("sidebarName", currentUser.name);
    setText("sidebarRole", role ? role[0].toUpperCase() + role.slice(1) : "Member");
    setText("welcomeName", currentUser.name);

    setText(
        "welcomeSummary",
        role === "student"
            ? "Discover alumni, find career opportunities and connect with mentors."
            : role === "alumni"
                ? "Share your experience, support students and grow your alumni network."
                : "Manage your ALUMNEX community."
    );

    setText("jobsNavLabel", role === "alumni" ? "Post Jobs" : "Jobs & Internships");
    setText("mentorshipNavLabel", role === "alumni" ? "Mentorship Requests" : "Mentorship");
    setText("mentorshipStatLabel", role === "student" ? "Mentorship opportunities" : "Mentorship activity");

    setAvatar("sidebarAvatar", currentUser.name, currentProfile?.profile?.photo_url);
    setAvatar("topAvatar", currentUser.name, currentProfile?.profile?.photo_url);

    if (role === "admin") {
        $("overviewStats")?.classList.add("hidden");
        loadAdmin();
    }
}

async function loadProfile() {
    try {
        const data = await apiRequest("/dashboard/profile");
        const user = data.user;
        const profile = user.profile || {};

        currentProfile = { ...user, profile };

        currentUser = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        };

        localStorage.setItem("alumnexUser", JSON.stringify(currentUser));

        setText("sidebarName", user.name);
        setText("welcomeName", user.name);
        setAvatar("sidebarAvatar", user.name, profile.photo_url);
        setAvatar("topAvatar", user.name, profile.photo_url);

        $("profileName").value = user.name || "";
        $("profileEmail").value = user.email || "";
        $("profileDepartment").value = profile.department || "";
        $("profilePhone").value = profile.phone || "";
        $("profilePhotoUrl").value = profile.photo_url || "";
        $("profileBio").value = profile.bio || "";
        $("profileLinkedinUrl").value = profile.linkedin_url || "";

        const isStudent = user.role === "student";

        [
            "profileCourseGroup",
            "profileStudyGroup",
            "profileSemesterGroup",
            "profileStudentGraduationGroup",
            "profileStudentSkillsGroup",
            "profileInterestsGroup",
            "profileCareerGoalsGroup",
            "profileResumeGroup",
            "profileGithubGroup"
        ].forEach(id => $(id)?.classList.toggle("hidden", !isStudent));

        [
            "profileAlumniSkillsGroup",
            "profileWorkExperienceGroup",
            "profileCareerJourneyGroup"
        ].forEach(id => $(id)?.classList.toggle("hidden", isStudent));

        $("profileStudyGroup")?.classList.toggle("hidden", !isStudent);
        $("profileGraduationGroup")?.classList.toggle("hidden", isStudent);
        $("profileCollegeGroup")?.classList.toggle("hidden", isStudent);
        $("profileCompanyGroup")?.classList.toggle("hidden", isStudent);
        $("profileDesignationGroup")?.classList.toggle("hidden", isStudent);

        if (isStudent) {
            $("profileCourse").value = profile.course || "";
            $("profileStudyYear").value = profile.study_year || "";
            $("profileSemester").value = profile.semester || "";
            $("profileStudentGraduation").value = profile.graduation_year || "";
            $("profileStudentSkills").value = profile.skills || "";
            $("profileInterests").value = profile.interests || "";
            $("profileCareerGoals").value = profile.career_goals || "";
            $("profileResumeUrl").value = profile.resume_url || "";
            $("profileGithubUrl").value = profile.github_url || "";
        } else {
            $("profileGraduation").value = profile.graduation_year || "";
            $("profileCollege").value = profile.college || "";
            $("profileCompany").value = profile.company || "";
            $("profileDesignation").value = profile.designation || "";
            $("profileAlumniSkills").value = profile.skills || "";
            $("profileWorkExperience").value = profile.work_experience || "";
            $("profileCareerJourney").value = profile.career_journey || "";
        }

        updateProfileCompletion(user, profile);
        setupRoleUI();

    } catch (error) {
        showNotice(error.message, "error");
    }
}

// PROFILE UPDATE
$("profileForm")?.addEventListener("submit", async event => {
    event.preventDefault();

    const payload = {
        name: $("profileName").value.trim(),
        department: $("profileDepartment").value.trim(),
        phone: $("profilePhone").value.trim(),
        photo_url: $("profilePhotoUrl").value.trim(),
        bio: $("profileBio").value.trim(),
        linkedin_url: $("profileLinkedinUrl").value.trim()
    };

    if (currentUser.role === "student") {
        payload.course = $("profileCourse").value.trim();
        payload.study_year = $("profileStudyYear").value;
        payload.semester = $("profileSemester").value.trim();
        payload.graduation_year = $("profileStudentGraduation").value;
        payload.skills = $("profileStudentSkills").value.trim();
        payload.interests = $("profileInterests").value.trim();
        payload.career_goals = $("profileCareerGoals").value.trim();
        payload.resume_url = $("profileResumeUrl").value.trim();
        payload.github_url = $("profileGithubUrl").value.trim();

    } else if (currentUser.role === "alumni") {
        payload.graduation_year = $("profileGraduation").value;
        payload.college = $("profileCollege").value.trim();
        payload.company = $("profileCompany").value.trim();
        payload.designation = $("profileDesignation").value.trim();
        payload.skills = $("profileAlumniSkills").value.trim();
        payload.work_experience = $("profileWorkExperience").value.trim();
        payload.career_journey = $("profileCareerJourney").value.trim();

    } else {
        showNotice("Admin profile editing is not enabled.", "error");
        return;
    }

    try {
        const data = await apiRequest("/dashboard/profile", {
            method: "PUT",
            body: JSON.stringify(payload)
        });

        currentUser.name = payload.name;

        currentProfile = {
            ...currentProfile,
            name: payload.name,
            profile: { ...currentProfile.profile, ...payload }
        };

        localStorage.setItem("alumnexUser", JSON.stringify(currentUser));

        setText("sidebarName", payload.name);
        setText("welcomeName", payload.name);

        setAvatar("sidebarAvatar", payload.name, payload.photo_url);
        setAvatar("topAvatar", payload.name, payload.photo_url);

        updateProfileCompletion(currentUser, currentProfile.profile);
        showNotice(data.message);

    } catch (error) {
        showNotice(error.message, "error");
    }
});

// ALUMNI DIRECTORY
async function loadAlumni(search = "") {
    const container = $("alumniList");
    if (!container) return;

    container.innerHTML = `<p class="muted">Loading alumni...</p>`;

    try {
        const data = await apiRequest(`/alumni?search=${encodeURIComponent(search)}`);

        if (!data.alumni?.length) {
            if (!search) setText("statAlumni", "0");
            container.innerHTML = `<div class="empty-state">No alumni found. Try another search.</div>`;
            return;
        }

        if (!search) setText("statAlumni", data.count ?? data.alumni.length);

        container.innerHTML = data.alumni.map(person => `
            <article class="person-card">
                <div class="person-avatar">${escapeHTML(person.name?.charAt(0) || "A")}</div>
                <h3>${escapeHTML(person.name)}</h3>
                <p class="person-role">${escapeHTML(person.designation || "Alumni")}</p>
                <p>${escapeHTML(person.company || "Company not listed")}</p>
                <p class="muted">${escapeHTML(person.department || "")}</p>
                <p class="muted">Graduated: ${escapeHTML(person.graduation_year || "—")}</p>
                ${currentUser.role === "student" ? `
                    <button class="btn btn-primary btn-small"
                        data-mentor="${Number(person.id)}"
                        data-name="${escapeHTML(person.name)}">
                        Request mentorship
                    </button>` : ""}
            </article>
        `).join("");

        container.querySelectorAll("[data-mentor]").forEach(button => {
            button.addEventListener("click", () => {
                requestMentorship(button.dataset.mentor, button.dataset.name);
            });
        });

    } catch (error) {
        container.innerHTML = `<p class="error-text">${escapeHTML(error.message)}</p>`;
    }
}

$("searchAlumni")?.addEventListener("click", () => {
    loadAlumni($("alumniSearch").value.trim());
});

$("alumniSearch")?.addEventListener("keydown", event => {
    if (event.key === "Enter") {
        loadAlumni(event.target.value.trim());
    }
});

// STUDENT DIRECTORY
async function loadStudents(search = "") {
    const container = $("studentList");
    if (!container) return;

    container.innerHTML = `<p class="muted">Loading student profiles...</p>`;

    try {
        const data = await apiRequest(
            `/alumni/students?search=${encodeURIComponent(search)}`
        );

        if (!data.students?.length) {
            container.innerHTML = `<div class="empty-state">No students found. Try another search.</div>`;
            return;
        }

        container.innerHTML = data.students.map(student => {
            return `
                <article class="person-card">
                    <div class="person-avatar">${escapeHTML(student.name?.charAt(0) || "S")}</div>
                    <h3>${escapeHTML(student.name)}</h3>
                    <p class="person-role">${escapeHTML(student.course || student.department || "Student")}</p>
                    ${student.course && student.department
                        ? `<p>${escapeHTML(student.department)}</p>` : ""}
                    <p class="muted">
                        Year ${escapeHTML(student.study_year || "—")}
                        · Semester ${escapeHTML(student.semester || "—")}
                    </p>
                </article>
            `;
        }).join("");
    } catch (error) {
        container.innerHTML = `<p class="error-text">${escapeHTML(error.message)}</p>`;
    }
}

$("searchStudents")?.addEventListener("click", () => {
    loadStudents($("studentSearch").value.trim());
});

$("studentSearch")?.addEventListener("keydown", event => {
    if (event.key === "Enter") {
        loadStudents(event.target.value.trim());
    }
});

// EVENTS
function renderEventCard(event, isMyEventsView = false) {
    const registrationLink = safeExternalUrl(event.registration_link);

    const isCreator = currentUser && Number(event.created_by) === Number(currentUser.id);
    const isAdmin = currentUser && currentUser.role === "admin";
    const canDelete = isAdmin || (currentUser?.role === "alumni" && isCreator);
    const canViewAttendees = isAdmin || (currentUser?.role === "alumni" && isCreator);

    const isRegistered = Number(event.is_registered) > 0;
    const canRegister = currentUser && (currentUser.role === "student" || currentUser.role === "alumni");
    const attendeeCount = Number(event.attendee_count) || 0;
    const creatorText = event.creator_name || (event.creator_role === "alumni" ? "Alumni" : "ALUMNEX Community");

    return `
        <article class="event-card">
            <div class="event-card-header">
                <span class="event-date">📅 ${escapeHTML(formatDate(event.event_date))}</span>
                ${isRegistered ? `<span class="badge badge-success">✓ Registered</span>` : ""}
            </div>
            <h3>${escapeHTML(event.title)}</h3>
            <p>${escapeHTML(event.description || "Join the ALUMNEX community for this event.")}</p>
            <div class="item-meta">📍 ${escapeHTML(event.venue || "Venue to be announced")}</div>
            <div class="item-meta">👤 Created by: <strong>${escapeHTML(creatorText)}</strong></div>
            <div class="item-meta">👥 <strong>${attendeeCount}</strong> ${attendeeCount === 1 ? "person" : "people"} registered</div>

            <div class="event-actions">
                ${canRegister ? (
                    isRegistered
                        ? `<button class="btn btn-outline btn-small" data-unregister-event="${Number(event.id)}">Cancel registration</button>`
                        : `<button class="btn btn-primary btn-small" data-register-event="${Number(event.id)}">Register for event</button>`
                ) : ""}

                ${registrationLink ? `
                    <a class="btn btn-secondary btn-small" href="${escapeHTML(registrationLink)}"
                       target="_blank" rel="noopener noreferrer">External Link ↗</a>` : ""}

                ${canViewAttendees ? `
                    <button class="btn btn-outline btn-small" data-view-attendees="${Number(event.id)}" data-event-title="${escapeHTML(event.title)}">
                        👥 View Registrations (${attendeeCount})
                    </button>` : ""}

                ${canDelete ? `
                    <button class="btn btn-danger btn-small" data-delete-event="${Number(event.id)}">
                        Delete event
                    </button>` : ""}
            </div>
        </article>
    `;
}

function attachEventActionHandlers(container) {
    if (!container) return;

    container.querySelectorAll("[data-register-event]").forEach(button => {
        button.addEventListener("click", () => registerForEvent(button.dataset.registerEvent));
    });

    container.querySelectorAll("[data-unregister-event]").forEach(button => {
        button.addEventListener("click", () => unregisterFromEvent(button.dataset.unregisterEvent));
    });

    container.querySelectorAll("[data-view-attendees]").forEach(button => {
        button.addEventListener("click", () => viewEventAttendees(button.dataset.viewAttendees, button.dataset.eventTitle));
    });

    container.querySelectorAll("[data-delete-event]").forEach(button => {
        button.addEventListener("click", () => deleteEvent(button.dataset.deleteEvent));
    });
}

async function loadEvents() {
    const container = $("eventList");
    if (!container) return;

    container.innerHTML = `<p class="muted">Loading events...</p>`;

    try {
        const data = await apiRequest("/events");
        const events = data.events || [];
        const upcomingEvents = events.filter(event => new Date(event.event_date) >= new Date());

        if (!events.length) {
            container.innerHTML = `<div class="empty-state">No events have been added yet.</div>`;
            $("overviewEvents").innerHTML = `<p class="muted">No events available.</p>`;
            setText("statEvents", "0");
            return;
        }

        setText("statEvents", upcomingEvents.length);
        container.innerHTML = events.map(event => renderEventCard(event, false)).join("");
        attachEventActionHandlers(container);

        $("overviewEvents").innerHTML = upcomingEvents.length
            ? upcomingEvents.slice(0, 3).map(event => `
                <div class="mini-item">
                    <strong>${escapeHTML(event.title)}</strong>
                    <small>${escapeHTML(formatDate(event.event_date))}</small>
                </div>
            `).join("")
            : `<p class="muted">No upcoming events.</p>`;

    } catch (error) {
        container.innerHTML = `<p class="error-text">${escapeHTML(error.message)}</p>`;
    }
}

async function loadMyEvents() {
    const container = $("myEventsList");
    if (!container) return;

    container.innerHTML = `<p class="muted">Loading your registrations...</p>`;

    try {
        const data = await apiRequest("/events/my");
        const events = data.events || [];

        if (!events.length) {
            container.innerHTML = `<div class="empty-state">You have not registered for any events yet.</div>`;
            return;
        }

        container.innerHTML = events.map(event => renderEventCard(event, true)).join("");
        attachEventActionHandlers(container);

    } catch (error) {
        container.innerHTML = `<p class="error-text">${escapeHTML(error.message)}</p>`;
    }
}

async function registerForEvent(id) {
    try {
        const data = await apiRequest(`/events/${id}/register`, { method: "POST" });
        showNotice(data.message || "Successfully registered for the event!");
        await loadEvents();
        if (!$("myEventsSection")?.classList.contains("hidden")) {
            await loadMyEvents();
        }
        loadNotifications();
    } catch (error) {
        showNotice(error.message, "error");
    }
}

async function unregisterFromEvent(id) {
    if (!confirm("Are you sure you want to cancel your registration for this event?")) return;

    try {
        const data = await apiRequest(`/events/${id}/register`, { method: "DELETE" });
        showNotice(data.message || "Registration cancelled.");
        await loadEvents();
        if (!$("myEventsSection")?.classList.contains("hidden")) {
            await loadMyEvents();
        }
        loadNotifications();
    } catch (error) {
        showNotice(error.message, "error");
    }
}

async function viewEventAttendees(eventId, eventTitle) {
    const panel = $("eventAttendeesPanel");
    const list = $("eventAttendeesList");
    const heading = $("attendeesHeading");
    if (!panel || !list) return;

    panel.classList.remove("hidden");
    if (heading) {
        heading.textContent = `Registrations for: "${eventTitle || "Event"}"`;
    }
    list.innerHTML = `<p class="muted">Loading registrations...</p>`;
    panel.scrollIntoView({ behavior: "smooth", block: "start" });

    try {
        const data = await apiRequest(`/events/${eventId}/attendees`);
        const attendees = data.attendees || [];
        const count = data.attendee_count ?? attendees.length;

        if (heading) {
            heading.textContent = `Registrations for: "${data.event?.title || eventTitle}" (${count})`;
        }

        if (!attendees.length) {
            list.innerHTML = `<div class="empty-state">No students have registered for this event yet.</div>`;
            return;
        }

        list.innerHTML = attendees.map(attendee => {
            const roleBadge = attendee.role === "student" ? "Student" : (attendee.role === "alumni" ? "Alumni" : "Member");
            const details = [];
            if (attendee.department) details.push(`Dept: ${escapeHTML(attendee.department)}`);
            if (attendee.course) details.push(`Course: ${escapeHTML(attendee.course)}`);
            if (attendee.study_year) details.push(`Year: ${escapeHTML(String(attendee.study_year))}`);
            if (attendee.semester) details.push(`Sem: ${escapeHTML(String(attendee.semester))}`);

            return `
                <div class="attendee-card">
                    <div class="attendee-header">
                        <div>
                            <strong>${escapeHTML(attendee.name || "Student")}</strong>
                            <span class="badge badge-role">${escapeHTML(roleBadge)}</span>
                        </div>
                        <small class="muted">Registered: ${escapeHTML(formatDate(attendee.registered_at))}</small>
                    </div>
                    <div class="attendee-info">
                        <div>✉️ <a href="mailto:${escapeHTML(attendee.email)}">${escapeHTML(attendee.email)}</a></div>
                        ${attendee.phone ? `<div>📞 <a href="tel:${escapeHTML(attendee.phone)}">${escapeHTML(attendee.phone)}</a></div>` : ""}
                        ${details.length ? `<div>🎓 ${details.join(" | ")}</div>` : ""}
                    </div>
                </div>
            `;
        }).join("");

    } catch (error) {
        list.innerHTML = `<p class="error-text">${escapeHTML(error.message)}</p>`;
    }
}

$("showAllEvents")?.addEventListener("click", () => {
    $("showAllEvents")?.classList.add("btn-primary");
    $("showAllEvents")?.classList.remove("btn-outline");
    $("showMyEvents")?.classList.add("btn-outline");
    $("showMyEvents")?.classList.remove("btn-primary");

    $("eventList")?.classList.remove("hidden");
    $("myEventsSection")?.classList.add("hidden");
    loadEvents();
});

$("showMyEvents")?.addEventListener("click", () => {
    $("showMyEvents")?.classList.add("btn-primary");
    $("showMyEvents")?.classList.remove("btn-outline");
    $("showAllEvents")?.classList.add("btn-outline");
    $("showAllEvents")?.classList.remove("btn-primary");

    $("eventList")?.classList.add("hidden");
    $("myEventsSection")?.classList.remove("hidden");
    $("eventAttendeesPanel")?.classList.add("hidden");
    loadMyEvents();
});

$("closeAttendees")?.addEventListener("click", () => {
    $("eventAttendeesPanel")?.classList.add("hidden");
});

$("eventForm")?.addEventListener("submit", async event => {
    event.preventDefault();

    const form = new FormData(event.target);
    const payload = Object.fromEntries(form.entries());

    try {
        const data = await apiRequest("/events", {
            method: "POST",
            body: JSON.stringify(payload)
        });

        event.target.reset();
        showNotice(data.message);
        loadEvents();

    } catch (error) {
        showNotice(error.message, "error");
    }
});

async function deleteEvent(id) {
    if (!confirm("Are you sure you want to delete this event?")) return;

    try {
        const data = await apiRequest(`/events/${id}`, { method: "DELETE" });
        showNotice(data.message);
        loadEvents();

    } catch (error) {
        showNotice(error.message, "error");
    }
}

// JOBS
async function loadJobs() {
    const container = $("jobList");
    if (!container) return;

    container.innerHTML = `<p class="muted">Loading jobs...</p>`;

    try {
        const data = await apiRequest("/jobs");
        const jobs = data.jobs || [];

        setText("statJobs", jobs.length);

        if (!jobs.length) {
            container.innerHTML = `<div class="empty-state">No job opportunities have been posted yet.</div>`;
            $("overviewJobs").innerHTML = `<p class="muted">No jobs available.</p>`;
            return;
        }

        container.innerHTML = jobs.map(job => `
            <article class="job-card">
                <span class="job-tag">CAREER OPPORTUNITY</span>
                <h3>${escapeHTML(job.title)}</h3>
                <p class="job-company">${escapeHTML(job.company)}</p>
                <p class="muted">📍 ${escapeHTML(job.location || "Location not specified")}</p>
                <p>${escapeHTML(job.description || "Contact the alumni member for more details.")}</p>
                <small>Posted by ${escapeHTML(job.alumni_name || "Alumni")}</small>
                <div class="job-actions">
                    ${job.application_link ? `
                        <a class="btn btn-primary btn-small" href="${escapeHTML(job.application_link)}"
                           target="_blank" rel="noopener noreferrer">Apply ↗</a>` : ""}
                    ${(currentUser.role === "alumni" && Number(job.alumni_id) === Number(currentUser.id)) ||
                      currentUser.role === "admin" ? `
                        <button class="btn btn-danger btn-small" data-delete-job="${Number(job.id)}">
                            Delete
                        </button>` : ""}
                </div>
            </article>
        `).join("");

        $("overviewJobs").innerHTML = jobs.slice(0, 3).map(job => `
            <div class="mini-item">
                <strong>${escapeHTML(job.title)}</strong>
                <small>${escapeHTML(job.company)}</small>
            </div>
        `).join("");

        container.querySelectorAll("[data-delete-job]").forEach(button => {
            button.addEventListener("click", () => deleteJob(button.dataset.deleteJob));
        });

    } catch (error) {
        container.innerHTML = `<p class="error-text">${escapeHTML(error.message)}</p>`;
    }
}

$("jobForm")?.addEventListener("submit", async event => {
    event.preventDefault();

    const payload = Object.fromEntries(new FormData(event.target).entries());

    try {
        const data = await apiRequest("/jobs", {
            method: "POST",
            body: JSON.stringify(payload)
        });

        event.target.reset();
        showNotice(data.message);
        loadJobs();

    } catch (error) {
        showNotice(error.message, "error");
    }
});

async function deleteJob(id) {
    if (!confirm("Delete this job posting?")) return;

    try {
        const data = await apiRequest(`/jobs/${id}`, { method: "DELETE" });
        showNotice(data.message);
        loadJobs();

    } catch (error) {
        showNotice(error.message, "error");
    }
}

// MENTORSHIP
async function requestMentorship(alumniId, alumniName) {
    const message = prompt(`Write a short message to ${alumniName}:`);
    if (message === null) return;

    try {
        const data = await apiRequest("/mentorship", {
            method: "POST",
            body: JSON.stringify({
                alumni_id: Number(alumniId),
                message
            })
        });

        showNotice(data.message);

    } catch (error) {
        showNotice(error.message, "error");
    }
}

async function loadMentorship() {
    const container = $("mentorshipList");
    if (!container) return;

    container.innerHTML = `<p class="muted">Loading mentorship activity...</p>`;

    try {
        const data = await apiRequest("/mentorship");
        const requests = data.requests || [];

        setText("statMentorship", requests.length);

        if (!requests.length) {
            container.innerHTML = `<div class="empty-state">No mentorship requests yet.</div>`;
            return;
        }

        container.innerHTML = requests.map(request => {
            const person = currentUser.role === "student"
                ? request.alumni_name
                : request.student_name;

            return `
                <div class="request-item">
                    <div>
                        <strong>${escapeHTML(person || "Community member")}</strong>
                        <p>${escapeHTML(request.message || "No message provided.")}</p>
                        <span class="status-pill status-${escapeHTML(request.status)}">
                            ${escapeHTML(request.status)}
                        </span>
                    </div>

                    ${currentUser.role === "alumni" && request.status === "pending" ? `
                        <div class="request-actions">
                            <button class="btn btn-primary btn-small"
                                data-request-id="${Number(request.id)}" data-status="accepted">Accept</button>
                            <button class="btn btn-danger btn-small"
                                data-request-id="${Number(request.id)}" data-status="rejected">Reject</button>
                        </div>` : ""}
                </div>
            `;
        }).join("");

        container.querySelectorAll("[data-request-id]").forEach(button => {
            button.addEventListener("click", () => updateMentorship(
                button.dataset.requestId,
                button.dataset.status
            ));
        });

    } catch (error) {
        container.innerHTML = `<p class="error-text">${escapeHTML(error.message)}</p>`;
    }
}

async function updateMentorship(id, status) {
    try {
        const data = await apiRequest(`/mentorship/${id}`, {
            method: "PATCH",
            body: JSON.stringify({ status })
        });

        showNotice(data.message);
        loadMentorship();

    } catch (error) {
        showNotice(error.message, "error");
    }
}

async function loadNotifications() {
    const container = $("notificationList");
    const overview = $("overviewNotifications");

    try {
        const data = await apiRequest("/notifications");
        const notifications = data.notifications || [];

        const render = items => items.length
            ? items.map(notification => `
                <div class="mini-item">
                    <strong>${escapeHTML(notification.title)}</strong>
                    <small>${escapeHTML(notification.message || "")}</small>
                    <small>${escapeHTML(formatDate(notification.created_at))}</small>
                </div>
            `).join("")
            : `<p class="muted">You're all caught up.</p>`;

        if (container) container.innerHTML = render(notifications);
        if (overview) overview.innerHTML = render(notifications.slice(0, 3));

    } catch (error) {
        const content = `<p class="error-text">${escapeHTML(error.message)}</p>`;
        if (container) container.innerHTML = content;
        if (overview) overview.innerHTML = content;
    }
}

// ADMIN
async function loadAdmin() {
    if (currentUser.role !== "admin") return;

    try {
        const [statsData, usersData] = await Promise.all([
            apiRequest("/admin/stats"),
            apiRequest("/admin/users")
        ]);

        const stats = statsData.stats || {};

        const statItems = [
            ["Total users", stats.total_users],
            ["Students", stats.students],
            ["Alumni", stats.alumni],
            ["Pending alumni", stats.pending_alumni],
            ["Events", stats.total_events],
            ["Jobs", stats.total_jobs],
            ["Mentorship requests", stats.total_mentorship_requests]
        ];

        $("adminStats").innerHTML = statItems.map(([label, value]) => `
            <article class="stat-card">
                <p>${escapeHTML(label)}</p>
                <h2>${Number(value || 0)}</h2>
            </article>
        `).join("");

        $("usersTable").innerHTML = (usersData.users || []).map(user => `
            <tr>
                <td>${escapeHTML(user.name)}</td>
                <td>${escapeHTML(user.email)}</td>
                <td>${escapeHTML(user.role)}</td>
                <td><span class="status-pill status-${escapeHTML(user.status)}">${escapeHTML(user.status)}</span></td>
                <td>
                    ${user.role !== "admin" ? `
                        <select data-user-status="${Number(user.id)}" data-role="${escapeHTML(user.role)}">
                            <option value="">Choose action</option>
                            <option value="approved">Approve</option>
                            <option value="blocked">Block</option>
                        </select>` : "—"}
                </td>
            </tr>
        `).join("");

        $("usersTable").querySelectorAll("[data-user-status]").forEach(select => {
            select.addEventListener("change", async () => {
                if (!select.value) return;

                const id = select.dataset.userStatus;
                const role = select.dataset.role;

                const endpoint = role === "alumni"
                    ? `/admin/alumni/${id}/status`
                    : `/admin/users/${id}/status`;

                try {
                    const data = await apiRequest(endpoint, {
                        method: "PATCH",
                        body: JSON.stringify({ status: select.value })
                    });

                    showNotice(data.message);
                    loadAdmin();

                } catch (error) {
                    showNotice(error.message, "error");
                    select.value = "";
                }
            });
        });

    } catch (error) {
        showNotice(error.message, "error");
    }
}

// INITIAL LOAD
async function initializeDashboard() {
    setupRoleUI();
    await loadProfile();

    loadEvents();
    loadJobs();
    loadNotifications();

    if (currentUser.role === "student") {
        loadAlumni();
    }

    loadMentorship();
}

initializeDashboard();
