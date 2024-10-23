const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Rota para cadastrar o usuário
router.post('/register', userController.registerUser);

// Rota para login do usuário
router.post('/login', userController.loginUser);

module.exports = router;