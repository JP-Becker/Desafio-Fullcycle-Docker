const express = require('express');
const mysql = require('mysql2/promise');
const axios = require('axios');

const app = express();
const PORT = 3000;

// Configuração do banco de dados
const dbConfig = {
    host: 'db',
    user: 'root',
    password: 'root',
    database: 'nodedb'
};

async function initDatabase() {
    try {
        const connection = await mysql.createConnection(dbConfig);

        // Criar tabela se não existir
        await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // Inserir alguns dados de exemplo se a tabela estiver vazia
        const [rows] = await connection.execute('SELECT COUNT(*) as count FROM users');
        if (rows[0].count === 0) {
            await connection.execute("INSERT INTO users (name) VALUES ('João'), ('Maria'), ('Pedro'), ('Ana')");
        }

        await connection.end();
        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Error initializing database:', error);
    }
}


async function getRandomNameFromAPI() {
    const api =
    {
        name: 'FakeNameAPI',
        url: 'https://api.namefake.com/portuguese-brazil/random',
        parser: (data) => data.name
    };

    try {
        console.log(`Tentando buscar nome da API: ${api.name}`);

        const response = await axios.get(api.url, {
            timeout: 5000,
            headers: {
                'User-Agent': 'Node.js App'
            }
        });

        const name = api.parser(response.data);
        console.log(`Nome obtido da API ${api.name}: ${name}`);
        return name;

    } catch (error) {
        console.error(`Erro na API ${api.name}:`, error.message);
    }

    // Se todas as APIs falharem, usar nome de fallback
    const fallbackNames = [
        'Carlos Silva', 'Fernanda Costa', 'Ricardo Santos', 'Juliana Oliveira',
        'Bruno Ferreira', 'Camila Rodrigues', 'Diego Almeida', 'Larissa Lima',
        'Gustavo Pereira', 'Mariana Souza', 'Felipe Barbosa', 'Tatiana Martins'
    ];

    const fallbackName = fallbackNames[Math.floor(Math.random() * fallbackNames.length)];
    console.log(`Todas as APIs falharam, usando nome de fallback: ${fallbackName}`);
    return fallbackName;
}

async function addRandomNameFromAPI() {
    try {
        const connection = await mysql.createConnection(dbConfig);

        const randomName = await getRandomNameFromAPI();

        // Verificar se o nome já existe
        const [existing] = await connection.execute('SELECT COUNT(*) as count FROM users WHERE name = ?', [randomName]);

        if (existing[0].count === 0) {
            await connection.execute('INSERT INTO users (name) VALUES (?)', [randomName]);
            console.log(`Nome adicionado: ${randomName}`);
        } else {
            const uniqueName = `${randomName} (${Date.now()})`;
            await connection.execute('INSERT INTO users (name) VALUES (?)', [uniqueName]);
            console.log(` Nome duplicado, adicionado com sufixo: ${uniqueName}`);
        }

        await connection.end();
        return randomName;
    } catch (error) {
        console.error('Erro ao adicionar nome da API:', error);

        try {
            const connection = await mysql.createConnection(dbConfig);
            const emergencyName = `Usuário ${Date.now()}`;
            await connection.execute('INSERT INTO users (name) VALUES (?)', [emergencyName]);
            await connection.end();
            console.log(`Nome generico: ${emergencyName}`);
            return emergencyName;
        } catch (dbError) {
            console.error('Erro crítico no banco:', dbError);
            return null;
        }
    }
}

app.get('/', async (req, res) => {
    try {
        await initDatabase();
        console.log('Nova requisição recebida, buscando nome da API...');

        // Adicionar um novo nome da API a cada acesso
        const newName = await addRandomNameFromAPI();

        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute('SELECT * FROM users ORDER BY created_at DESC');
        await connection.end();

        let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Node.js + MySQL + API Externa</title>
        <meta charset="utf-8">
      </head>
      <body>
        <h1>Full Cycle Rocks!</h1>
        <ul>
    `;

        rows.forEach(user => {
            html += `<li>${user.name} (ID: ${user.id})`;
        });

        html += `
        </ul>
        <p>Total de usuários: ${rows.length}</p>
        <p>Atualize a página para adicionar mais um usuário!</p>
      </body>
      </html>
    `;

        res.send(html);
    } catch (error) {
        console.error(' Erro na rota principal:', error);
        res.status(500).send('<h1>Erro ao conectar com o banco de dados</h1>');
    }
});



app.listen(PORT, '0.0.0.0', () => {
    console.log(` Server running on port ${PORT}`);
});