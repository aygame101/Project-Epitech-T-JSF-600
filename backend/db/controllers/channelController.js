const Channel = require('../models/channel');
const User = require('../models/user');

const createChannel = async (req, res) => {
  try {
    const { name, description, creator } = req.body;

    const existingChannel = await Channel.findOne({ name });
    if (existingChannel) {
      return res.status(400).json({ error: 'Ce canal existe déjà' });
    }

    const channel = await Channel.create({
      name,
      description,
      creator,
      members: [creator]
    });

    await User.findByIdAndUpdate(creator, {
      $addToSet: { channels: channel._id }
    });

    res.status(201).json(channel);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getChannels = async (req, res) => {
  try {
    const filter = req.query.filter || "";

    const channels = await Channel.find({
      name: { $regex: filter, $options: 'i' }
    }).select('name -_id');

    res.status(200).json(channels.map(c => c.name));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const joinChannel = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { userId } = req.body;

    const [channel, user] = await Promise.all([
      Channel.findById(channelId),
      User.findById(userId)
    ]);

    if (!channel || !user) {
      return res.status(404).json({ error: 'Ressource non trouvée' });
    }

    if (channel.members.includes(userId)) {
      return res.status(400).json({ error: 'Déjà membre de ce canal' });
    }

    await Promise.all([
      Channel.findByIdAndUpdate(channelId, {
        $addToSet: { members: userId }
      }),
      User.findByIdAndUpdate(userId, {
        $addToSet: { channels: channelId }
      })
    ]);

    res.status(200).json({ message: 'Canal rejoint avec succès' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const deleteChannel = async (req, res) => {
  try {
    const { name } = req.params;
    const { userId } = req.query;

    const channel = await Channel.findOne({ name });

    if (!channel) {
      return res.status(404).json({ error: 'Canal non trouvé' });
    }

    if (channel.creator.toString() !== userId) {
      return res.status(403).json({ error: 'Action non autorisée' });
    }

    await User.updateMany(
      { channels: channel._id },
      { $pull: { channels: channel._id } }
    );

    await Channel.deleteOne({ name });

    res.status(200).json({ message: 'Canal supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getChannelMembersByName = async (req, res) => {
  try {
    const { name } = req.params;

    const channel = await Channel.findOne({ name }).populate('members', 'username');

    if (!channel) {
      return res.status(404).json({ error: 'Canal introuvable' });
    }

    const memberUsernames = channel.members.map((user) => user.username);
    return res.status(200).json(memberUsernames);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createChannel,
  getChannels,
  joinChannel,
  deleteChannel,
  getChannelMembersByName,
};