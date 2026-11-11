
const registerForm = document.getElementById("registerForm");
const loginForm = document.getElementById("loginForm");
const logoutButton = document.getElementById("logoutButton");

const accountStatus = document.getElementById("accountStatus");
const message = document.getElementById("message");

const accountsTable = document.getElementById("accountsTable");
const accountCount = document.getElementById("accountCount");

// Display messages
function showMessage(text, isError = false) {
    message.textContent = text;
    message.style.color = isError ? "red" : "green";
}

// Send requests to the backend
async function apiRequest(endpoint, method = "GET", body = null) {
    const options = {
        method,
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include"
    };

    if (body !== null) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(`/api/auth${endpoint}`, options);

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || "Something went wrong.");
    }

    return data;
}

// Register
registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
        const data = await apiRequest("/register", "POST", {
            username: document.getElementById("registerUsername").value,
            email: document.getElementById("registerEmail").value,
            password: document.getElementById("registerPassword").value
        });

        showMessage(data.message);
        registerForm.reset();

        await refreshDashboard();

    } catch (error) {
        showMessage(error.message, true);
    }
});

// Login
loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
        const data = await apiRequest("/login", "POST", {
            email: document.getElementById("loginEmail").value,
            password: document.getElementById("loginPassword").value
        });

        showMessage(data.message);
        loginForm.reset();

        await refreshDashboard();

    } catch (error) {
        showMessage(error.message, true);
    }
});

// Logout
logoutButton.addEventListener("click", async () => {
    try {
        const data = await apiRequest("/logout", "POST");

        showMessage(data.message);

        await refreshDashboard();

    } catch (error) {
        showMessage(error.message, true);
    }
});

// Check current login status
async function checkAccountStatus() {
    try {
        const data = await apiRequest("/me");

        accountStatus.textContent =
            `Logged in as ${data.user.username} (${data.user.email})`;

        logoutButton.hidden = false;

    } catch (error) {
        accountStatus.textContent = "Not currently logged in.";
        logoutButton.hidden = true;
    }
}

// Retrieve and display all registered accounts
async function loadAccounts() {
    try {
        const data = await apiRequest("/accounts");

        accountsTable.replaceChildren();

        accountCount.textContent = data.accounts.length;

        if (data.accounts.length === 0) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");

            cell.colSpan = 3;
            cell.textContent = "No registered accounts.";

            row.appendChild(cell);
            accountsTable.appendChild(row);

            return;
        }

        data.accounts.forEach(account => {
            const row = document.createElement("tr");

            const usernameCell = document.createElement("td");
            usernameCell.textContent = account.username;

            const emailCell = document.createElement("td");
            emailCell.textContent = account.email;

            const dateCell = document.createElement("td");
            dateCell.textContent =
                new Date(account.createdAt).toLocaleDateString();

            row.appendChild(usernameCell);
            row.appendChild(emailCell);
            row.appendChild(dateCell);

            accountsTable.appendChild(row);
        });

    } catch (error) {
        accountsTable.textContent = "Unable to load accounts.";
        accountCount.textContent = "—";
    }
}

// Refresh everything on the dashboard
async function refreshDashboard() {
    await Promise.all([
        checkAccountStatus(),
        loadAccounts()
    ]);
}

// Run when the page loads
refreshDashboard();