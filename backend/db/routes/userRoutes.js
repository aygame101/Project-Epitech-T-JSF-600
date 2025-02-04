const express = require('express');
const router = express.Router();

const User = require('../models/user');
const Channel = require('../models/channel');

const { createUser, getUsers, updateUser } = require('../controllers/userController');

router.post('/login', async (req, res) => {
  const { username } = req.body;
  try {
    let user = await User.findOneAndUpdate(
      { username },
      { $set: { lastConnected: new Date() } },
      { new: true, upsert: true }
    );

    // cherche le général, si non trouver créé
    let generalChannel = await Channel.findOne({ name: 'Général' });
    if (!generalChannel) {
      generalChannel = await Channel.create({ name: 'Général' });
    }

    // ajout user dans général
    if (!user.channels.includes(generalChannel._id)) {
      user.channels.push(generalChannel._id);
      await user.save();
    }
    if (!generalChannel.members.includes(user._id)) {
      generalChannel.members.push(user._id);
      await generalChannel.save();
    }

    // cherche le PM, si non trouver créé
    let pmChannel = await Channel.findOne({ name: 'PM' });
    if (!pmChannel) {
      pmChannel = await Channel.create({ name: 'PM' });
    }

    // ajout user dans général
    if (!user.channels.includes(pmChannel._id)) {
      user.channels.push(pmChannel._id);
      await user.save();
    }
    if (!pmChannel.members.includes(user._id)) {
      pmChannel.members.push(user._id);
      await pmChannel.save();
    }

    user = await user.populate('channels', 'name');

    return res.status(200).json({
      userId: user._id,
      username: user.username,
      channels: user.channels.map((c) => c.name),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erreur lors de la connexion' });
  }
});


router.post('/', createUser);

router.get('/', getUsers);

router.put('/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { username: req.body.username },
      { new: true, runValidators: true }
    );

    if (!user) return res.status(404).send();
    res.json(user);

  } catch (error) {
    res.status(400).json({ error: "Ce pseudo est déjà utilisé" });
  }
});

router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId)
      .populate('channels', 'name');

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    return res.json({
      userId: user._id,
      username: user.username,
      channels: user.channels.map(ch => ch.name),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Une erreur est survenue' });
  }
});

module.exports = router;
