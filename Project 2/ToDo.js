
const STORAGE_KEY = "codynnflowTasks";
const THEME_KEY = "taskFlowTheme";

let tasks = [];
let editingId = null;
let toastTimeout;

const $ = (id) => document.getElementById(id);

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function localDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function loadData() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        const parsed = saved ? JSON.parse(saved) : null;

        if (Array.isArray(parsed)) {
            tasks = parsed;
        } else {
            tasks = [
                {
                    id: 1,
                    title: "Complete portfolio website",
                    status: "progress",
                    priority: "critical",
                    completed: false,
                    dueDate: "",
                    dueTime: "09:00",
                    notified: false
                },
                {
                    id: 2,
                    title: "Practise JavaScript concepts",
                    status: "pending",
                    priority: "normal",
                    completed: false,
                    dueDate: "",
                    dueTime: "09:00",
                    notified: false
                },
                {
                    id: 3,
                    title: "Review project documentation",
                    status: "pending",
                    priority: "minor",
                    completed: false,
                    dueDate: "",
                    dueTime: "09:00",
                    notified: false
                },
                {
                    id: 4,
                    title: "Organise internship tasks",
                    status: "completed",
                    priority: "normal",
                    completed: true,
                    dueDate: "",
                    dueTime: "09:00",
                    notified: false
                }
            ];
        }
    } catch (error) {
        console.error("Unable to load saved tasks:", error);
        tasks = [];
        showToast("Saved data could not be read. Please check the browser console.");
    }

    tasks = tasks.map(task => {
        const completed = task.status === "completed" ||
            task.completed === true;

        return {
            ...task,
            id: task.id ?? Date.now() + Math.random(),
            title: String(task.title ?? ""),
            status: completed ? "completed" :
                ["pending", "progress"].includes(task.status)
                    ? task.status : "pending",
            priority: ["minor", "normal", "critical"].includes(task.priority)
                ? task.priority : "normal",
            completed,
            dueDate: task.dueDate || "",
            dueTime: task.dueTime || "09:00",
            notified: task.notified === true
        };
    });

    updateGreeting();
    loadTheme();
    saveData();
    renderTasks();
}

function saveData() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (error) {
        console.error("Unable to save tasks:", error);
        showToast("Could not save tasks. Check your browser storage.");
    }
}

function updateGreeting() {
    const hour = new Date().getHours();
    let greeting = "Good morning!";

    if (hour >= 12 && hour < 18) {
        greeting = "Good afternoon!";
    } else if (hour >= 18) {
        greeting = "Good evening!";
    }

    $("greeting").textContent = greeting;
}

function getVisibleTasks() {
    const query = $("searchInput").value.trim().toLowerCase();
    const filter = $("filterStatus").value;

    return tasks.filter(task => {
        const matchesSearch = task.title.toLowerCase().includes(query);
        const matchesFilter = filter === "all" || task.status === filter;

        return matchesSearch && matchesFilter;
    });
}

function renderTasks() {
    const visibleTasks = getVisibleTasks();

    const onHold = visibleTasks.filter(task => !task.completed);
    const completed = visibleTasks.filter(task => task.completed);

    $("onHoldTasks").innerHTML = onHold.length
        ? onHold.map(renderTask).join("")
        : `<div class="empty-state">
            <i class="fas fa-clipboard-check"></i>
            <p>${tasks.length ? "No matching pending tasks." : "No tasks yet. Add your first task!"}</p>
           </div>`;

    $("completedTasks").innerHTML = completed.length
        ? completed.map(renderTask).join("")
        : `<div class="empty-state">
            <i class="fas fa-check-circle"></i>
            <p>No completed tasks to show.</p>
           </div>`;

    $("onHoldCount").textContent =
        `${onHold.length} ${onHold.length === 1 ? "task" : "tasks"}`;

    $("completedSectionCount").textContent =
        `${completed.length} ${completed.length === 1 ? "task" : "tasks"}`;

    updateStatistics();
}

function renderTask(task) {
    const title = escapeHTML(task.title);
    const statusLabels = {
        pending: "Pending",
        progress: "In progress",
        completed: "Completed"
    };

    const priorityLabels = {
        minor: "Low",
        normal: "Medium",
        critical: "High"
    };

    const isCompleted = task.completed;
    const due = getDueInfo(task);

    const dueHTML = task.dueDate
        ? `<span class="due-date ${due.className}">
                <i class="fas fa-calendar-alt"></i>
                ${escapeHTML(due.label)}
           </span>`
        : "";

    return `
        <article class="task-item">
            <button
                type="button"
                class="task-checkbox ${isCompleted ? "completed" : ""}"
                onclick="toggleTask(${JSON.stringify(task.id)})"
                aria-label="${isCompleted ? "Mark incomplete" : "Mark completed"}: ${title}"
                aria-pressed="${isCompleted}">
            </button>

            <div class="task-content">
                <div class="task-title ${isCompleted ? "completed" : ""}">
                    ${title}
                </div>

                <div class="task-meta">
                    ${dueHTML}
                    <span>
                        <i class="fas fa-flag"></i>
                        ${priorityLabels[task.priority]}
                    </span>
                </div>
            </div>

            <span class="status-badge status-${task.status}">
                ${statusLabels[task.status]}
            </span>

            <div class="task-actions">
                <button type="button" class="icon-btn"
                    onclick="editTask(${JSON.stringify(task.id)})"
                    aria-label="Edit ${title}" title="Edit task">
                    <i class="fas fa-pen"></i>
                </button>

                <button type="button" class="icon-btn delete-btn"
                    onclick="deleteTask(${JSON.stringify(task.id)})"
                    aria-label="Delete ${title}" title="Delete task">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </article>
    `;
}

function getDueInfo(task) {
    if (!task.dueDate) {
        return { label: "", className: "" };
    }

    const today = localDateString();
    const now = new Date();
    const dueDateTime = new Date(`${task.dueDate}T${task.dueTime || "23:59"}`);
    const overdue = task.dueDate < today ||
        (task.dueDate === today && dueDateTime < now);

    if (task.completed) {
        return {
            label: `Due ${task.dueDate}`,
            className: ""
        };
    }

    if (overdue) {
        return {
            label: `Overdue · ${task.dueDate}`,
            className: "overdue"
        };
    }

    if (task.dueDate === today) {
        return {
            label: `Due today${task.dueTime ? ` · ${task.dueTime}` : ""}`,
            className: "due-soon"
        };
    }

    return {
        label: `Due ${task.dueDate}`,
        className: ""
    };
}

// ---------- Statistics ----------

function updateStatistics() {
    const total = tasks.length;
    const completed = tasks.filter(task => task.completed).length;
    const pending = total - completed;
    const rate = total ? Math.round(completed / total * 100) : 0;
    const pendingRate = total ? Math.round(pending / total * 100) : 0;

    $("totalTasks").textContent = total;
    $("completedCount").textContent = completed;
    $("pendingCount").textContent = pending;
    $("completionRateValue").textContent = `${rate}%`;

    $("sidebarCompleted").textContent = completed;
    $("sidebarPending").textContent = pending;
    $("ringRate").textContent = `${rate}%`;

    $("completionProgress").style.width = `${rate}%`;
    $("pendingProgress").style.width = `${pendingRate}%`;

    $("progressRing").style.setProperty("--progress", `${rate}%`);
}

function openModal() {
    editingId = null;
    $("taskForm").reset();

    $("modalTitle").textContent = "Create a task";
    $("taskDueDate").min = localDateString();
    $("taskDueTime").value = "09:00";

    $("taskModal").classList.add("active");
    $("taskTitle").focus();
}

function closeModal() {
    $("taskModal").classList.remove("active");
    $("taskForm").reset();
    editingId = null;
}

function editTask(id) {
    const task = tasks.find(item => item.id === id);
    if (!task) return;

    editingId = id;
    $("modalTitle").textContent = "Update your task";
    $("taskTitle").value = task.title;
    $("taskStatus").value = task.status;
    $("taskPriority").value = task.priority;
    $("taskDueDate").value = task.dueDate || "";
    $("taskDueDate").min = "";
    $("taskDueTime").value = task.dueTime || "09:00";

    $("taskModal").classList.add("active");
    $("taskTitle").focus();
}

$("taskForm").addEventListener("submit", event => {
    event.preventDefault();

    const title = $("taskTitle").value.trim();
    const status = $("taskStatus").value;
    const priority = $("taskPriority").value;
    const dueDate = $("taskDueDate").value;
    const dueTime = $("taskDueTime").value || "09:00";

    if (!title) {
        showToast("Please enter a task title.");
        return;
    }

    let task;

    if (editingId !== null) {
        task = tasks.find(item => item.id === editingId);
        if (!task) return;

        const reminderChanged =
            task.dueDate !== dueDate || task.dueTime !== dueTime;

        Object.assign(task, {
            title,
            status,
            priority,
            completed: status === "completed",
            dueDate,
            dueTime,
            notified: reminderChanged ? false : task.notified
        });

        showToast("Task updated successfully!");
    } else {
        task = {
            id: Date.now(),
            title,
            status,
            priority,
            completed: status === "completed",
            dueDate,
            dueTime,
            notified: false
        };

        tasks.push(task);
        showToast("Task added successfully!");
    }

    saveData();
    renderTasks();
    closeModal();
});

function toggleTask(id) {
    const task = tasks.find(item => item.id === id);
    if (!task) return;

    task.completed = !task.completed;
    task.status = task.completed ? "completed" : "pending";

    saveData();
    renderTasks();

    showToast(task.completed ? "Great work! Task completed." : "Task marked as pending.");
}

function deleteTask(id) {
    const task = tasks.find(item => item.id === id);
    if (!task) return;

    if (!confirm(`Delete "${task.title}"?`)) return;

    tasks = tasks.filter(item => item.id !== id);

    saveData();
    renderTasks();
    showToast("Task deleted.");
}

$("searchInput").addEventListener("input", renderTasks);
$("filterStatus").addEventListener("change", renderTasks);

function loadTheme() {
    let savedTheme = "light";

    try {
        savedTheme = localStorage.getItem(THEME_KEY) || "light";
    } catch (error) {
        console.warn("Theme preference is unavailable.");
    }

    applyTheme(savedTheme === "dark");
}

function applyTheme(isDark) {
    document.body.classList.toggle("dark-mode", isDark);

    const icon = $("themeToggle").querySelector("i");
    icon.className = isDark ? "fas fa-sun" : "fas fa-moon";

    $("themeToggle").title = isDark ? "Switch to light mode" : "Switch to dark mode";
    $("themeToggle").setAttribute(
        "aria-label",
        isDark ? "Switch to light mode" : "Switch to dark mode"
    );

    try {
        localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
    } catch (error) {
        console.warn("Could not save theme preference.");
    }
}

$("themeToggle").addEventListener("click", () => {
    applyTheme(!document.body.classList.contains("dark-mode"));
});

$("notificationBtn").addEventListener("click", async () => {
    if (!("Notification" in window)) {
        showToast("This browser does not support notifications.");
        return;
    }

    if (!window.isSecureContext) {
        showToast("Open this site on localhost or HTTPS to enable notifications.");
        return;
    }

    try {
        const permission = await Notification.requestPermission();

        if (permission === "granted") {
            showToast("Reminders enabled. Keep this page open.");
            checkReminders();
        } else {
            showToast("Notifications were not enabled. Check browser permissions.");
        }
    } catch (error) {
        showToast("Unable to enable notifications.");
    }
});

function checkReminders() {
    if (!("Notification" in window) ||
        Notification.permission !== "granted") {
        return;
    }

    const now = new Date();

    tasks.forEach(task => {
        if (task.completed || !task.dueDate || task.notified) return;

        const dueDateTime = new Date(
            `${task.dueDate}T${task.dueTime || "09:00"}`
        );

        // Trigger when the reminder time is reached.
        if (!Number.isNaN(dueDateTime.getTime()) && now >= dueDateTime) {
            try {
                new Notification("TaskFlow reminder", {
                    body: task.title,
                    tag: `task-${task.id}`
                });

                task.notified = true;
                saveData();
            } catch (error) {
                console.error("Notification could not be displayed:", error);
            }
        }
    });
}

// ---------- Toast messages ----------

function showToast(message) {
    const toast = $("toast");
    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.remove("show");
    }, 2800);
}

$("taskModal").addEventListener("click", event => {
    if (event.target === $("taskModal")) {
        closeModal();
    }
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape" && $("taskModal").classList.contains("active")) {
        closeModal();
    }
});

document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
        checkReminders();
        renderTasks();
    }
});

loadData();
checkReminders();

setInterval(checkReminders, 30000);
