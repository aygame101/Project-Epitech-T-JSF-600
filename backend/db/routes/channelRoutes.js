const express = require('express');
const {
  createChannel,
  getChannels,
  joinChannel,
  deleteChannel,
  getChannelMembersByName,
} = require('../controllers/channelController');

const router = express.Router();

const Channel = require('../models/channel');
const User = require('../models/user');

// Routes
router.post('/', createChannel);

router.get('/', getChannels);

router.post('/:channelId/join', joinChannel);

router.delete('/:name', deleteChannel);

router.get('/:name/members', getChannelMembersByName);

router.post('/join-multiple', async (req, res) => {
  try {
    const { channelNames, userId } = req.body;

    // Trouver les canaux
    const channels = await Channel.find({ name: { $in: channelNames } });
    if (channels.length !== channelNames.length) {
      return res.status(404).json({ error: "Un ou plusieurs canaux non trouvés" });
    }

    // Mettre à jour l'utilisateur
    await User.findByIdAndUpdate(userId, {
      $addToSet: { channels: { $each: channels.map(c => c._id) } }
    });

    res.status(200).json({
      message: `${channels.length} canaux rejoints`,
      channels: channels.map(c => c.name)
    });

  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/quit-multiple', async (req, res) => {
  try {
    const { userId, channelNames } = req.body;

    if (channelNames.includes('Général')) {
      return res.status(403).json({ error: "Impossible de quitter le canal Général." });
    }

    const channels = await Channel.find({ name: { $in: channelNames } });
    if (!channels || channels.length === 0) {
      return res.status(404).json({ error: 'Aucun canal trouvé' });
    }

    for (let channel of channels) {
      channel.members = channel.members.filter(m => m.toString() !== userId);
      await channel.save();
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    user.channels = user.channels.filter(
      (c) => !channels.map(ch => ch._id.toString()).includes(c.toString())
    );
    await user.save();

    return res.status(200).json({
      message: `Tu as quitté ${channels.length} canal(aux).`,
      channels: channels.map(ch => ch.name)
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});


module.exports = router;