// randomUser.js
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

/**
 * Función asíncrona para obtener un usuario aleatorio y formatearlo.
 * @returns {Promise<Object>} Objeto del roommate con id, name, debe y recibe.
 */
async function getRandomUser() {
    try {
        const response = await axios.get('https://randomuser.me/api/');
        const user = response.data.results[0];
        return {
            id: uuidv4(),
            name: `${user.name.first} ${user.name.last}`,
            debe: 0,
            recibe: 0
        };
    } catch (error) {
        console.error('Error fetching random user:', error);
        throw new Error('Failed to fetch random user');
    }
}

module.exports = { getRandomUser };
