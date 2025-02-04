const express = require('express');
const {
  createMessage,
  getMessagesByChannel,
  sendPrivateMessage,
  getPrivateMessages
} = require('../controllers/messageController');

const router = express.Router();

router.post('/channel', createMessage);
router.get('/channel/:channelId', getMessagesByChannel);

router.post('/private', sendPrivateMessage);
router.get('/pm', getPrivateMessages);


module.exports = router;
