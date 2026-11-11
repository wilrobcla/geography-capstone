function getProfile(req, res) {
    const user = req.user;

    res.json({
        profile: {
            id: user.id,
            username: user.username,
            email: user.email,
            createdAt: user.createdAt
        }
    });
}

module.exports = {
    getProfile
};