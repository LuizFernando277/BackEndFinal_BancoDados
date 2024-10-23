const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Caminho para o arquivo SQLite
const dbPath = path.resolve(__dirname, '../database.sqlite');

// Conectar ao banco de dados SQLite
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao conectar ao SQLite:', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite');
    }
});

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT,
            email TEXT,
            data_nascimento TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS auth (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            username TEXT,
            password_hash TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);
});

// Função para cadastrar o usuário
exports.registerUser = async (req, res) => {
    const { nome, email, data_nascimento, username, password } = req.body;

    try {
        // Criptografar a senha
        const hashedPassword = await bcrypt.hash(password, 10);

        // Usar transação para garantir consistência
        db.serialize(() => {
            // Inserir na tabela 'users'
            db.run(
                `INSERT INTO users (nome, email, data_nascimento) VALUES (?, ?, ?)`,
                [nome, email, data_nascimento],
                function (err) {
                    if (err) {
                        return res.status(500).send('Erro ao cadastrar o usuário');
                    }

                    const userId = this.lastID;

                    // Inserir na tabela 'auth'
                    db.run(
                        `INSERT INTO auth (user_id, username, password_hash) VALUES (?, ?, ?)`,
                        [userId, username, hashedPassword],
                        function (err) {
                            if (err) {
                                return res.status(500).send('Erro ao cadastrar o usuário');
                            }

                            res.send('Usuário cadastrado com sucesso!');
                        }
                    );
                }
            );
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Erro ao cadastrar o usuário');
    }
};

// Função para realizar login
exports.loginUser = (req, res) => {
    const { username, password } = req.body;

    // Verificar se o usuário existe no banco de dados
    db.get(
        `SELECT * FROM auth WHERE username = ?`,
        [username],
        async (err, row) => {
            if (err) {
                console.error('Erro ao buscar o usuário:', err.message);
                return res.status(500).send('Erro ao realizar login');
            }

            if (!row) {
                // Se o usuário não for encontrado
                return res.status(400).send('Usuário não encontrado');
            }

            // Verificar se a senha está correta
            const isMatch = await bcrypt.compare(password, row.password_hash);
            if (isMatch) {
                res.send('Login bem-sucedido!');
            } else {
                res.status(400).send('Senha incorreta');
            }
        }
    );
};