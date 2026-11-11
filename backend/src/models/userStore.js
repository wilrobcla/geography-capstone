const users = new Map();

// Find a user by email
function findUserByEmail(email) {
    return [...users.values()].find(
        user => user.email === email
    );
}

// Find a user by username
function findUserByUsername(username) {
    return [...users.values()].find(
        user => user.username === username
    );
}

// Find a user by ID
function findUserById(id) {
    return users.get(id);
}

// Create a new user
function createUser(user) {
    users.set(user.id, user);
    return user;
}

function getAllUsers() {
    return [...users.values()];
}

module.exports = {
    findUserByEmail,
    findUserByUsername,
    findUserById,
    createUser,
    getAllUsers
};