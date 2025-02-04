const User = require('../models/user');

const createUser = async (req, res) => {
  try {
    const { username } = req.body;
    const user = await User.create({ username });
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username } = req.body;
    const user = await User.findByIdAndUpdate(id, { username }, { new: true });
    res.status(200).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = { createUser, getUsers, updateUser };
